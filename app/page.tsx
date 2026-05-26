import Dashboard from '@/components/Dashboard';
import { redis } from '@/lib/redis';
import { scrapeAnnouncement } from '@/services/scraper';

// Force dynamic execution to bypass static caching, since MEB page checks must happen in real time
export const dynamic = 'force-dynamic';

export default async function Home() {
  const lastAnnouncementKey = 'aol_last_announcement';
  const lastCheckedKey = 'aol_last_checked';

  let announcement = null;
  let lastChecked = null;
  let history: any[] = [];

  try {
    // 1. Directly fetch state from Redis inside Server Component
    announcement = await redis.get<any>(lastAnnouncementKey);
    lastChecked = await redis.get<string>(lastCheckedKey);
    history = await redis.get<any[]>('aol_announcement_history') || [];
  } catch (redisError) {
    console.error('Server side Redis fetch failed:', redisError);
  }

  // 2. Seeding check: If Redis is empty, scrape and seed it
  if (!announcement) {
    console.log('Server page: Redis empty. Seeding live scraped data...');
    try {
      announcement = await scrapeAnnouncement();
      await redis.set(lastAnnouncementKey, announcement);
      // Synchronize lastChecked timestamp with the seeding event
      lastChecked = new Date().toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      await redis.set(lastCheckedKey, lastChecked);
    } catch (scrapeError) {
      console.error('Server side seeding scraper failed:', scrapeError);
      // Fallback object to prevent server crash if MEB is offline during deployment
      announcement = {
        id: 'seed-fallback',
        title: 'ÖĞRETİM YILI 3. DÖNEM KAYIT YENİLEME İŞLEMLERİ BAŞLAMIŞTIR.',
        description: 'Açık Öğretim Lisesi 2025-2026 Eğitim Öğretim yılı 3. dönem kayıt yenileme işlemleri başlamıştır. Detaylar ve kılavuzlar için resmi siteyi ziyaret edin.',
        link: 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481/tr',
        publishDate: '28.04.2026',
        updateDate: '15.05.2026',
        files: [
          {
            title: 'Kayıt Yenileme Kılavuzu',
            url: 'https://aol.meb.gov.tr/meb_iys_dosyalar/2026_05/6a05cf5cac03c371107068_A%C3%A7%C4%B1k_%C3%96%C4%9Fretim_Lisesi_2025-2026_E%C4%9Fitim_%C3%96%C4%9Fretim_Y%C4%B1l%C4%B1_3.D%C3%B6nem_Kay%C4%B1t_Yenileme_K%C4%B1lavuzu.pdf'
          }
        ],
        deadline: new Date('2026-06-08T23:59:59+03:00').toISOString()
      };
    }
  }

  // 3. Fallback check for lastChecked time
  if (!lastChecked) {
    lastChecked = new Date().toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    try {
      await redis.set(lastCheckedKey, lastChecked);
    } catch (e) {
      console.error('Failed to set last checked in Redis:', e);
    }
  }

  const mockHistory = [
    {
      id: 'mock-hist-1',
      title: '2025-2026 EĞİTİM ÖĞRETİM YILI 2. DÖNEM SINAV SONUÇLARI AÇIKLANDI 🌸',
      description: 'Açık Öğretim Lisesi 2. dönem sınav sonuçları öğrenci bilgi sistemine yüklenmiştir. Öğrencilerimiz T.C. Kimlik No ve şifreleri ile sisteme giriş yaparak sonuçlarını öğrenebilirler.',
      link: 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481/tr',
      publishDate: '18.03.2026',
      updateDate: '18.03.2026',
      files: []
    },
    {
      id: 'mock-hist-2',
      title: '2025-2026 EĞİTİM ÖĞRETİM YILI 2. DÖNEM SINAV GİRİŞ BELGELERİ YAYIMLANDI 📝',
      description: 'Açık Öğretim Lisesi 2. dönem sınav giriş belgeleri yayımlanmıştır. Sınava girecek öğrencilerin belgelerini sistemden yazdırıp sınav günü yanlarında bulundurmaları zorunludur.',
      link: 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481/tr',
      publishDate: '28.02.2026',
      updateDate: '28.02.2026',
      files: []
    },
    {
      id: 'mock-hist-3',
      title: 'AÇIK ÖĞRETİM LİSESİ E-SINAV RANDEVU İŞLEMLERİ BAŞLAMIŞTIR 🗓️',
      description: 'Açık Öğretim Lisesi öğrencileri için e-Sınav randevu modülü açılmıştır. Sınav randevunuzu almak için öğrenci giriş ekranından işlemlerinizi tamamlayabilirsiniz. Randevu almayan öğrenciler sınava katılamayacaktır.',
      link: 'https://aol.meb.gov.tr/www/onemli-duyuru/icerik/481/tr',
      publishDate: '10.02.2026',
      updateDate: '10.02.2026',
      files: [],
      deadline: new Date('2026-02-28T23:59:59+03:00').toISOString()
    }
  ];

  // Seed history if empty or has 1 item
  if (history.length <= 1) {
    const activeItem = announcement ? [announcement] : [];
    const filteredMocks = mockHistory.filter(
      mock => !activeItem.some(active => active.title === mock.title)
    );
    history = [...activeItem, ...filteredMocks];
    try {
      await redis.set('aol_announcement_history', history);
    } catch (historySeedError) {
      console.error('Failed to save seeded history to Redis:', historySeedError);
    }
  }

  const isMock = !process.env.UPSTASH_REDIS_REST_URL;
  const redisType = isMock ? 'In-Memory (Geliştirici Modu)' : 'Upstash Production Redis';

  return (
    <main className="min-h-screen pt-[env(safe-area-inset-top)] bg-transparent text-zinc-800 flex flex-col items-center justify-start overflow-x-hidden relative">
      {/* Background gradients for premium aesthetic */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Render the core dashboard */}
      <Dashboard
        initialAnnouncement={announcement}
        initialHistory={history}
        initialLastChecked={lastChecked}
        initialRedisType={redisType}
      />
    </main>
  );
}
