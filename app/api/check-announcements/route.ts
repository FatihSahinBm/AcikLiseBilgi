import { NextRequest, NextResponse } from 'next/server';
import { scrapeAnnouncement } from '@/services/scraper';
import { redis } from '@/lib/redis';
import { sendBroadcastNotification } from '@/services/onesignal';

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

    return NextResponse.json({
      success: true,
      timestamp: lastCheckedTime,
      isNewAnnouncement: isNew,
      forced: force,
      notificationSent,
      announcement: currentAnnouncement,
      previousId: lastStored?.id || null,
      pushResult
    });
  } catch (error: any) {
    console.error('API /check-announcements Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Bir iç sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
