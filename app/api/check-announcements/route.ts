import { NextRequest, NextResponse } from 'next/server';
import { scrapeAnnouncement, extractDeadline, detectAnnouncementType } from '@/services/scraper';
import { redis } from '@/lib/redis';
import { sendBroadcastNotification, sendReminderNotification } from '@/services/onesignal';

// Set this to allow Next.js to run as dynamic route (critical for APIs reading from external websites/Redis)
export const dynamic = 'force-dynamic';

async function addAnnouncementToHistory(announcement: any) {
  try {
    const historyKey = 'aol_announcement_history';
    let history = await redis.get<any[]>(historyKey) || [];
    
    // Check if this announcement already exists in history
    const exists = history.some((item: any) => item.id === announcement.id || item.title === announcement.title);
    if (!exists) {
      history = [announcement, ...history];
      history = history.slice(0, 5);
      await redis.set(historyKey, history);
      console.log('Added announcement to history in Redis. Current count:', history.length);
    }
  } catch (err) {
    console.error('Failed to add announcement to history in Redis:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 1. Cron Security Validation (Standard Vercel Cron best practice)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('Authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !force) {
      console.warn('Unauthorized cron check attempt blocked.');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or invalid CRON_SECRET token.' },
        { status: 401 }
      );
    }

    console.log('Starting announcement check...');

    // 2. Scrape the current MEB page
    const currentAnnouncement = await scrapeAnnouncement();
    
    // Ensure history is initialized
    const historyKey = 'aol_announcement_history';
    const existingHistory = await redis.get<any[]>(historyKey);
    if (!existingHistory || existingHistory.length === 0) {
      await redis.set(historyKey, [currentAnnouncement]);
    }
    
    // 3. Fetch the last stored announcement from Redis
    const lastAnnouncementKey = 'aol_last_announcement';
    const lastCheckedKey = 'aol_last_checked';
    
    const lastStored = await redis.get<any>(lastAnnouncementKey);
    const lastCheckedTime = new Date().toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Update the last checked timestamp in Redis
    await redis.set(lastCheckedKey, lastCheckedTime);

    let notificationSent = false;
    let isNew = false;
    let pushResult: any = null;

    // 4. Compare with last stored announcement
    const isActuallyNew = !lastStored || lastStored.id !== currentAnnouncement.id;
    
    if (force || isActuallyNew) {
      isNew = isActuallyNew;
      console.log('Announcement check complete. Force update:', force, 'Actually new:', isActuallyNew, 'Current ID:', currentAnnouncement.id);
      
      // Update Redis cache
      await redis.set(lastAnnouncementKey, currentAnnouncement);
      
      if (isActuallyNew) {
        await addAnnouncementToHistory(currentAnnouncement);

        // Trigger Web Push Notification via OneSignal ONLY if it is a genuinely new announcement!
        const notificationTitle = `Açık Lise: ${currentAnnouncement.title.substring(0, 50)}...`;
        const notificationBody = `Yeni Önemli Duyuru Yayınlandı! Tarih: ${currentAnnouncement.updateDate}. Okumak için tıklayın.`;
        
        pushResult = await sendBroadcastNotification(
          notificationTitle,
          notificationBody,
          currentAnnouncement.link
        );
        
        notificationSent = pushResult.success;
      }
    } else {
      console.log('No new announcement detected. ID matched:', currentAnnouncement.id);
    }

    // 5. Registration/Course Selection/e-Exam Reminders Logic (7 days, 3 days, 1 day remaining)
    const announcementType = detectAnnouncementType(currentAnnouncement.title, currentAnnouncement.description);
    const deadline = extractDeadline(currentAnnouncement.title, currentAnnouncement.description);
    let reminderSent = false;
    let reminderDaysRemaining: number | null = null;
    let reminderResult: any = null;

    if (announcementType !== 'none' && deadline) {
      // Calculate remaining days in Turkey timezone (GMT+3) safely using UTC to avoid server timezone drift
      const nowUTC = Date.now();
      const turkeyOffsetMs = 3 * 60 * 60 * 1000;
      const turkeyTime = new Date(nowUTC + turkeyOffsetMs);
      const todayMs = Date.UTC(
        turkeyTime.getUTCFullYear(),
        turkeyTime.getUTCMonth(),
        turkeyTime.getUTCDate()
      );
      
      const deadlineMs = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
      const diffDays = Math.round((deadlineMs - todayMs) / (1000 * 60 * 60 * 24));
      
      reminderDaysRemaining = diffDays;
      console.log(`Announcement type: ${announcementType}, Deadline: ${new Date(deadlineMs).toISOString()}, days remaining: ${diffDays}`);

      // Self-healing, bracket-based reminders
      let targetTier: '7d' | '3d' | '1d' | null = null;
      let dayText = '';

      if (diffDays >= 4 && diffDays <= 7) {
        targetTier = '7d';
        dayText = diffDays === 7 ? '1 hafta' : `${diffDays} gün`;
      } else if (diffDays >= 2 && diffDays <= 3) {
        targetTier = '3d';
        dayText = `${diffDays} gün`;
      } else if (diffDays >= 0 && diffDays <= 1) {
        targetTier = '1d';
        dayText = diffDays === 1 ? 'son 1 gün' : 'bugün son gün';
      }

      if (targetTier) {
        const reminderKey = `aol_reminder_sent:${announcementType}:${currentAnnouncement.id}:${targetTier}`;
        const alreadySent = await redis.get<boolean>(reminderKey);

        if (!alreadySent) {
          console.log(`Sending ${targetTier} reminder (${diffDays} days remaining) for ${announcementType} (announcement ${currentAnnouncement.id})`);
          
          let reminderTitle = '';
          let reminderBody = '';
          let tagKey = '';

          switch (announcementType) {
            case 'registration':
              tagKey = 'kayit_yenilendi_id';
              reminderTitle = diffDays <= 1 
                ? 'Kayıt yenileme için SON GÜN! ⚠️' 
                : `Kayıt yenileme için son ${diffDays} gün! 🎀`;
              reminderBody = `Kayıt yenileme döneminin bitmesine ${dayText} kaldı! Sınavlara katılabilmek için kaydınızı yenilediniz mi?`;
              break;
            case 'course_selection':
              tagKey = 'ders_secildi_id';
              reminderTitle = diffDays <= 1
                ? 'Ders seçimi için SON GÜN! ⚠️'
                : `Ders seçimi için son ${diffDays} gün! 📚`;
              reminderBody = `Ders seçimi döneminin bitmesine ${dayText} kaldı! Sınavlara gireceğiniz dersleri seçtiniz mi?`;
              break;
            case 'exam_appointment':
              tagKey = 'randevu_alindi_id';
              reminderTitle = diffDays <= 1
                ? 'e-Sınav randevusu için SON GÜN! ⚠️'
                : `e-Sınav randevusu için son ${diffDays} gün! 🗓️`;
              reminderBody = `e-Sınav randevusu alma süresinin bitmesine ${dayText} kaldı! Sınav merkezinizi ve saatinizi belirlediniz mi?`;
              break;
          }

          if (tagKey) {
            reminderResult = await sendReminderNotification(
              tagKey,
              currentAnnouncement.id,
              reminderTitle,
              reminderBody,
              currentAnnouncement.link
            );

            if (reminderResult.success) {
              reminderSent = true;
              // Mark as sent in Redis with 10 days expiry
              await redis.set(reminderKey, true, { ex: 10 * 24 * 60 * 60 });
            }
          }
        } else {
          console.log(`Reminder already sent for tier ${targetTier} key: ${reminderKey}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: lastCheckedTime,
      isNewAnnouncement: isNew,
      forced: force,
      notificationSent,
      announcement: currentAnnouncement,
      previousId: lastStored?.id || null,
      pushResult,
      announcementType,
      registrationDeadline: deadline ? deadline.toISOString() : null,
      reminderDaysRemaining,
      reminderSent,
      reminderResult
    });
  } catch (error: any) {
    console.error('API /check-announcements Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Bir iç sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}


