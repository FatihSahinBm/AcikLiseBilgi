'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  Copy,
  Share2,
  Cpu,
  Volume2,
  VolumeX,
  RefreshCw,
  Info
} from 'lucide-react';

interface FileAttachment {
  title: string;
  url: string;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  link: string;
  publishDate: string;
  updateDate: string;
  files: FileAttachment[];
}

interface DashboardProps {
  initialAnnouncement: Announcement;
  initialLastChecked: string;
  initialRedisType: string;
}

export default function Dashboard({
  initialAnnouncement,
  initialLastChecked,
  initialRedisType
}: DashboardProps) {
  // Scraped Data State
  const [announcement, setAnnouncement] = useState<Announcement>(initialAnnouncement);
  const [lastChecked, setLastChecked] = useState<string>(initialLastChecked);
  const [redisType, setRedisType] = useState<string>(initialRedisType);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Platform & PWA states
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  // OneSignal Push State
  const [oneSignalLoaded, setOneSignalLoaded] = useState(false);
  const [permission, setPermission] = useState<string>('loading');
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{ success: boolean; message: string } | null>(null);

  // Notification Copy Alert State
  const [copied, setCopied] = useState(false);

  // 1. Detect platform and PWA standalone status
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const standalone =
      (window.navigator as any).standalone ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // If iOS and not installed yet, show the custom Add to Home Screen PWA prompt
    if (ios && !standalone) {
      setShowIosPrompt(true);
    }
  }, []);

  // 2. Initialize OneSignal client
  useEffect(() => {
    // Check if OneSignal script is loaded on window
    const checkOneSignal = () => {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) {
        setOneSignalLoaded(true);
        OneSignal.push(() => {
          // Initialize OneSignal
          OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false // We use our custom UI
            }
          });

          // Read initial permission and subscription status
          updatePushStatus();

          // Listen to changes
          OneSignal.Notifications.addEventListener('permissionChange', (permissionState: any) => {
            console.log('OneSignal Permission Change:', permissionState);
            setPermission(permissionState ? 'granted' : 'denied');
            updatePushStatus();
          });

          // Check if muted state is saved in LocalStorage
          const localMuteState = localStorage.getItem('aol_push_muted') === 'true';
          setIsMuted(localMuteState);
        });
        return true;
      }
      return false;
    };

    // Poll for OneSignal load
    if (!checkOneSignal()) {
      const interval = setInterval(() => {
        if (checkOneSignal()) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Helper: Retrieve permission and device ID from OneSignal Web SDK
  const updatePushStatus = async () => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    OneSignal.push(async () => {
      const currentPermission = OneSignal.Notifications.permission;
      setPermission(currentPermission ? 'granted' : 'default');

      // Get device push subscription ID
      const subscription = OneSignal.User.PushSubscription;
      if (subscription && subscription.id) {
        setSubscriptionId(subscription.id);
        
        // Synced local state with actual optOut status in OneSignal
        const optOutStatus = subscription.optedOut;
        setIsMuted(optOutStatus);
        localStorage.setItem('aol_push_muted', optOutStatus.toString());
      } else {
        setSubscriptionId('');
      }
    });
  };

  // 3. Trigger permission request
  const enableNotifications = async () => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) {
      alert('OneSignal yüklenirken hata oluştu. Lütfen sayfayı yenileyin veya reklam engelleyicinizi kapatın.');
      return;
    }

    try {
      console.log('Requesting OneSignal push permission...');
      await OneSignal.Notifications.requestPermission();
      await updatePushStatus();
    } catch (err) {
      console.error('Error enabling notifications:', err);
    }
  };

  // 4. Mute / Sessize Al Toggle
  const toggleMute = async () => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal || !subscriptionId) return;

    OneSignal.push(async () => {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      localStorage.setItem('aol_push_muted', nextMuted.toString());

      if (nextMuted) {
        // Mute: Opt-out from OneSignal
        await OneSignal.User.PushSubscription.optOut();
      } else {
        // Unmute: Opt-in back to OneSignal
        await OneSignal.User.PushSubscription.optIn();
      }
      console.log(`Push notifications muted: ${nextMuted}`);
      await updatePushStatus();
    });
  };

  // 5. Send targeted test notification to currently registered ID
  const sendTestNotification = async () => {
    if (!subscriptionId) return;
    setTestPushLoading(true);
    setTestPushResult(null);

    try {
      const res = await fetch('/api/send-test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId })
      });

      const data = await res.json();
      if (data.success) {
        setTestPushResult({
          success: true,
          message: 'Harika! Test bildirimi başarıyla gönderildi, 1-2 saniye içinde cihazınıza ulaşacaktır.'
        });
      } else {
        setTestPushResult({
          success: false,
          message: data.error || 'Test bildirimi gönderilemedi.'
        });
      }
    } catch (err: any) {
      setTestPushResult({
        success: false,
        message: err.message || 'Ağ hatası oluştu.'
      });
    } finally {
      setTestPushLoading(false);
    }
  };

  // 6. Manual force check and refresh
  const triggerManualCheck = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/check-announcements?force=true');
      const data = await res.json();
      if (data.success) {
        setAnnouncement(data.announcement);
        setLastChecked(data.timestamp);
        // Refresh local fetch
        const annRes = await fetch('/api/announcements');
        const annData = await annRes.json();
        if (annData.success) {
          setRedisType(annData.redisType);
        }
      }
    } catch (err) {
      console.error('Manual check failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-8 relative z-10">
      
      {/* Dynamic ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-indigo-500/10 blur-[80px] sm:blur-[120px] pointer-events-none -z-10" />

      {/* Header and status area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">AOL Duyuru Takip</h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-500/30">
              PWA v1.0
            </span>
          </div>
          <p className="text-sm text-zinc-400">MEB Açık Öğretim Lisesi önemli duyuruları anlık cebinizde.</p>
        </div>

        {/* Sync / refresh details */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Kontrol: <strong className="text-zinc-200">{lastChecked}</strong></span>
            <button
              onClick={triggerManualCheck}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-zinc-300 disabled:opacity-50"
              title="Şimdi Kontrol Et"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>Store: <strong className="text-zinc-200">{redisType}</strong></span>
          </div>
        </div>
      </div>

      {/* PWA State Instructions for iOS Safari outside PWA */}
      {showIosPrompt && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl animate-fade-in">
          <div className="flex gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl h-fit">
              <Share2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-200">iPhone Safari Bildirim Kurulumu</h2>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Apple güvenlik politikası gereği, iPhone cihazlarda Web Push bildirimleri alabilmek için bu siteyi 
                <strong> Ana Ekrana Eklemeniz</strong> gerekmektedir.
              </p>
              <div className="bg-black/30 p-3 rounded-lg text-xs space-y-1.5 text-zinc-200 border border-white/5">
                <p>1. Safari çubuğundaki <strong className="text-white">"Paylaş" (Share) 📤</strong> butonuna dokunun.</p>
                <p>2. Menüyü kaydırıp <strong className="text-white">"Ana Ekrana Ekle" (Add to Home Screen) ➕</strong> seçeneğine tıklayın.</p>
                <p>3. Ana ekrana eklenen uygulamayı açıp alttaki <strong>"Bildirimleri Aç"</strong> butonunu aktif edin.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Announcement display & Notification settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Notification Control Panel */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">BİLDİRİM AYARLARI</h2>
            
            {/* Status Visualizer */}
            <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-xl border border-white/5 space-y-3">
              <div className={`p-4 rounded-full ${
                permission === 'granted' && !isMuted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : permission === 'granted' && isMuted
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {permission === 'granted' && !isMuted ? (
                  <Bell className="w-8 h-8 animate-bounce" />
                ) : permission === 'granted' && isMuted ? (
                  <BellOff className="w-8 h-8" />
                ) : (
                  <BellOff className="w-8 h-8" />
                )}
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Durum</div>
                <div className="text-sm font-bold text-white">
                  {permission === 'granted'
                    ? isMuted
                      ? 'Sessize Alındı'
                      : 'Bildirimler Aktif'
                    : permission === 'denied'
                    ? 'Engellendi'
                    : 'İzin Bekleniyor'}
                </div>
              </div>
            </div>

            {/* Toggle Actions */}
            <div className="space-y-3">
              {permission !== 'granted' ? (
                <button
                  onClick={enableNotifications}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  Bildirimleri Aç
                </button>
              ) : (
                <div className="space-y-2">
                  {/* Mute Button */}
                  <button
                    onClick={toggleMute}
                    className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${
                      isMuted
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <Volume2 className="w-4 h-4" />
                        Sesi Aç (Aktifleştir)
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4" />
                        Bildirimleri Sessize Al
                      </>
                    )}
                  </button>

                  {/* Send Test Notification Button */}
                  <button
                    onClick={sendTestNotification}
                    disabled={testPushLoading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 font-medium py-3 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {testPushLoading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    Test Bildirimi Gönder
                  </button>
                </div>
              )}
            </div>

            {/* Test Notification Result Alert */}
            {testPushResult && (
              <div className={`p-4 rounded-xl text-xs flex gap-2 border ${
                testPushResult.success 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-300 border-red-500/20'
              }`}>
                <Info className="w-4 h-4 shrink-0" />
                <p>{testPushResult.message}</p>
              </div>
            )}

            {/* Subscription Key Debug Card */}
            {subscriptionId && (
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>OneSignal Aygıt Kimliği:</span>
                  <button
                    onClick={() => copyToClipboard(subscriptionId)}
                    className="hover:text-white p-1 rounded transition-colors"
                    title="Kimliği Kopyala"
                  >
                    {copied ? 'Kopyalandı!' : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="font-mono text-zinc-300 break-all select-all bg-black/50 p-2.5 rounded border border-white/5 leading-normal">
                  {subscriptionId}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Latest Announcement Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6 backdrop-blur-md">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">MEB SON DUYURU</h2>
                <div className="text-xs text-indigo-400 font-medium">Scraped from: aol.meb.gov.tr</div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  Yayın: {announcement.publishDate}
                </span>
                <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  Güncelleme: {announcement.updateDate}
                </span>
              </div>
            </div>

            {/* Title card with modern layout */}
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {announcement.title}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {announcement.description}
              </p>
            </div>

            {/* Attached Files & Guides Section */}
            {announcement.files && announcement.files.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Eğitim ve Kayıt Kılavuzları
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {announcement.files.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl hover:bg-indigo-950/20 hover:border-indigo-500/20 active:scale-[0.99] transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-lg group-hover:bg-indigo-500/35 group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
                          {file.title}
                        </span>
                      </div>
                      <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Official Webpage action button */}
            <a
              href={announcement.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 py-3 px-5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] w-full"
            >
              Resmi MEB Duyuru Sayfasına Git
              <ExternalLink className="w-4 h-4" />
            </a>

          </div>
        </div>

      </div>

      {/* Informative Footer */}
      <footer className="text-center text-xs text-zinc-500 pt-6 space-y-2 border-t border-white/5">
        <p>© 2026 MEB AOL Duyuru Takip PWA uygulaması.</p>
        <p className="max-w-md mx-auto leading-relaxed">
          Bu uygulama MEB sitesini her 15 dakikada bir kontrol eder ve güncellemeleri iPhone / Android PWA 
          cihazlarınıza anında iletir.
        </p>
      </footer>

    </div>
  );
}
