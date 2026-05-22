import { NextRequest, NextResponse } from 'next/server';
import { scrapeAnnouncement, extractDeadline, detectAnnouncementType } from '@/services/scraper';
import { redis } from '@/lib/redis';
import { sendBroadcastNotification, sendReminderNotification } from '@/services/onesignal';

// Set this to allow Next.js to run as dynamic route (critical for APIs reading from external websites/Redis)
export const dynamic = 'force-dynamic';

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
    if (force || !lastStored || lastStored.id !== currentAnnouncement.id) {
      isNew = true;
      console.log('New announcement detected or force trigger active! Current ID:', currentAnnouncement.id);
      
      // Update Redis
      await redis.set(lastAnnouncementKey, currentAnnouncement);
      
      // Trigger Web Push Notification via OneSignal
      const notificationTitle = `Açık Lise: ${currentAnnouncement.title.substring(0, 50)}...`;
      const notificationBody = `Yeni Önemli Duyuru Yayınlandı! Tarih: ${currentAnnouncement.updateDate}. Okumak için tıklayın.`;
      
      pushResult = await sendBroadcastNotification(
        notificationTitle,
        notificationBody,
        currentAnnouncement.link
      );
      
      notificationSent = pushResult.success;
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
      // Calculate remaining days in Turkey timezone
      const trDateStr = new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
      const nowTR = new Date(trDateStr);
      const today = new Date(nowTR.getFullYear(), nowTR.getMonth(), nowTR.getDate());
      
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      reminderDaysRemaining = diffDays;
      console.log(`Announcement type: ${announcementType}, Deadline: ${deadlineDate.toISOString()}, days remaining: ${diffDays}`);

      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        const reminderKey = `aol_reminder_sent:${announcementType}:${currentAnnouncement.id}:${diffDays}d`;
        const alreadySent = await redis.get<boolean>(reminderKey);

        if (!alreadySent) {
          console.log(`Sending ${diffDays}-day reminder for ${announcementType} (announcement ${currentAnnouncement.id})`);
          let dayText = `${diffDays} gün`;
          if (diffDays === 7) dayText = '1 hafta';
          else if (diffDays === 1) dayText = 'son 1 gün';

          let reminderTitle = '';
          let reminderBody = '';
          let tagKey = '';

          switch (announcementType) {
            case 'registration':
              tagKey = 'kayit_yenilendi_id';
              reminderTitle = `Kayıt yeniledin mi? 🎀`;
              reminderBody = `Kayıt yenileme döneminin bitmesine ${dayText} kaldı! Sınavlara katılabilmek için kaydınızı yenilediniz mi?`;
              break;
            case 'course_selection':
              tagKey = 'ders_secildi_id';
              reminderTitle = `Ders seçimini yaptın mı? 📚`;
              reminderBody = `Ders seçimi döneminin bitmesine ${dayText} kaldı! Sınavlara gireceğiniz dersleri seçtiniz mi?`;
              break;
            case 'exam_appointment':
              tagKey = 'randevu_alindi_id';
              reminderTitle = `e-Sınav randevunu aldın mı? 🗓️`;
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
          console.log(`Reminder already sent for ${diffDays} days key: ${reminderKey}`);
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


