import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { scrapeAnnouncement } from '@/services/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const lastAnnouncementKey = 'aol_last_announcement';
    const lastCheckedKey = 'aol_last_checked';

    // 1. Fetch current stored announcement and last checked time from Redis
    let announcement = await redis.get<any>(lastAnnouncementKey);
    let lastChecked = await redis.get<string>(lastCheckedKey);

    // 2. Seeding check: If Redis has no announcement (e.g. first deployment), scrape and seed it
    if (!announcement) {
      console.log('Redis announcement empty! Seeding with live scraped data...');
      announcement = await scrapeAnnouncement();
      await redis.set(lastAnnouncementKey, announcement);
      
      const currentTime = new Date().toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      await redis.set(lastCheckedKey, currentTime);
      lastChecked = currentTime;
    }

    // Fetch history
    const historyKey = 'aol_announcement_history';
    let history = await redis.get<any[]>(historyKey) || [];
    if (history.length === 0 && announcement) {
      history = [announcement];
      await redis.set(historyKey, history);
    }

    // Determine what type of Redis is active
    const isMock = !process.env.UPSTASH_REDIS_REST_URL;

    return NextResponse.json({
      success: true,
      announcement,
      history,
      lastChecked: lastChecked || 'Henüz kontrol edilmedi',
      redisType: isMock ? 'In-Memory (Geliştirici Modu)' : 'Upstash Production Redis'
    });
  } catch (error: any) {
    console.error('API /announcements Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Duyurular yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
