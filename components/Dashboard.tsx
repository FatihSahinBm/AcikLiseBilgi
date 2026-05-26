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
  Info,
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BellRing
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
  deadline?: string;
}

interface DashboardProps {
  initialAnnouncement: Announcement;
  initialHistory?: Announcement[];
  initialLastChecked: string;
  initialRedisType: string;
}

function AnnouncementCountdown({ deadlineStr }: { deadlineStr?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!deadlineStr) return;

    const calculateText = () => {
      const deadline = new Date(deadlineStr);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Süre Doldu');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days} gün ${hours} saat`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} saat ${minutes} dak`);
      } else {
        setTimeLeft(`${minutes} dak kaldı!`);
      }
    };

    calculateText();
    const interval = setInterval(calculateText, 60000); // update every minute
    return () => clearInterval(interval);
  }, [deadlineStr]);

  if (!deadlineStr || !timeLeft) return null;

  const isExpired = timeLeft === 'Süre Doldu';
  const deadlineDate = new Date(deadlineStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 select-none ${
      isExpired
        ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
        : 'bg-rose-50 text-rose-600 border-rose-200/50 animate-pulse'
    }`}>
      <span className="shrink-0">⏳</span>
      <span>Son Gün: {deadlineDate} ({timeLeft})</span>
    </div>
  );
}


const HelloKittyBow = () => (
  <svg viewBox="0 0 100 80" className="w-8 h-8 drop-shadow-[0_2px_6px_rgba(244,63,94,0.3)] select-none shrink-0 animate-bounce" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animationDuration: '3s' }}>
    <ellipse cx="30" cy="40" rx="20" ry="22" fill="#ff4b6c" stroke="#1a1a1a" strokeWidth="4.5" />
    <ellipse cx="70" cy="40" rx="20" ry="22" fill="#ff4b6c" stroke="#1a1a1a" strokeWidth="4.5" />
    <path d="M 35 30 C 25 35 25 45 35 50" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M 65 30 C 75 35 75 45 65 50" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="50" cy="40" r="11" fill="#ff4b6c" stroke="#1a1a1a" strokeWidth="4.5" />
  </svg>
);

const TARGETS = {
  yazili: new Date('2026-07-18T09:30:00+03:00'),
  esinaV: new Date('2026-07-01T09:00:00+03:00')
};
const START_DATE = new Date('2026-05-15T00:00:00+03:00');

function calculateTimeLeft(targetDate: Date) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, completed: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, completed: false };
}

function CountdownTimer() {
  const [activeTab, setActiveTab] = useState<'yazili' | 'esinaV'>('esinaV');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: false });
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const targetDate = TARGETS[activeTab];
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft(targetDate));

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const targetDate = TARGETS[activeTab];
  const now = new Date();
  const total = targetDate.getTime() - START_DATE.getTime();
  const remaining = targetDate.getTime() - now.getTime();
  const progressPercent = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));

  return (
    <div className="bg-white/70 border border-pink-200/50 rounded-3xl backdrop-blur-md shadow-xl shadow-pink-100/40 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-6 border-b border-pink-100/40">
        <h2 className="text-xs font-semibold tracking-wider text-pink-500 uppercase flex items-center gap-1.5 select-none">
          <Clock className="w-3.5 h-3.5 text-pink-400" />
          <span>SINAV GERİ SAYIMI</span>
          <span>⏳</span>
        </h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
          {/* Tabs */}
          <div className="flex bg-pink-50/50 p-1.5 rounded-2xl border border-pink-100/80">
            <button
              onClick={() => setActiveTab('yazili')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'yazili'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                  : 'text-zinc-650 hover:text-pink-600'
              }`}
            >
              Yazılı Sınav (18 Tem)
            </button>
            <button
              onClick={() => setActiveTab('esinaV')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'esinaV'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                  : 'text-zinc-650 hover:text-pink-600'
              }`}
            >
              e-Sınav (01 Tem)
            </button>
          </div>

          {/* Timer display */}
          {timeLeft.completed ? (
            <div className="text-center py-4 text-pink-600 font-bold text-sm bg-pink-50/30 rounded-2xl border border-pink-100/50 flex flex-col items-center gap-1.5 animate-pulse">
              <Sparkles className="w-6 h-6 text-pink-500" />
              <span>Sınav Zamanı Geldi! Başarılar Dileriz 🌸</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Gün', value: timeLeft.days },
                { label: 'Saat', value: timeLeft.hours },
                { label: 'Dak', value: timeLeft.minutes },
                { label: 'Sn', value: timeLeft.seconds }
              ].map((unit, i) => (
                <div key={i} className="bg-pink-50/40 border border-pink-100/80 p-2.5 rounded-2xl flex flex-col items-center shadow-sm">
                  <span className="text-xl sm:text-2xl font-black text-pink-700 leading-tight">
                    {unit.value.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold">{unit.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
              <span>Dönem Hazırlığı</span>
              <span className="font-bold text-pink-600">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-pink-100/40 rounded-full border border-pink-100 overflow-hidden shadow-inner p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-1000 shadow-md"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Tips Accordion */}
          <div className="border-t border-pink-100/60 pt-4 space-y-2">
            <button
              onClick={() => setShowTips(!showTips)}
              className="w-full flex items-center justify-between text-xs font-bold text-pink-650 hover:text-pink-700 select-none cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                Önemli Sınav İpuçları & Kılavuz
              </span>
              {showTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTips && (
              <div className="bg-pink-50/30 border border-pink-100/50 p-4 rounded-2xl text-xs text-zinc-650 space-y-2.5 animate-fade-in leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-pink-500 shrink-0">🌸</span>
                  <p><strong>Fotoğraflı Giriş Belgesi:</strong> Belgesinde fotoğraf bulunmayan öğrenciler sınava alınmaz. Halk Eğitim'den fotoğrafınızı sisteme yükletin.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-500 shrink-0">🌸</span>
                  <p><strong>Geçerli Kimlik Kartı:</strong> Sınav günü fotoğraflı kimlik veya pasaportunuzu yanınızda getirmeyi unutmayın.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-500 shrink-0">🌸</span>
                  <p><strong>e-Sınav Randevusu:</strong> 9 ve daha az sayıda ders seçtiyseniz e-Sınav randevusu almak zorundasınız.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-500 shrink-0">🌸</span>
                  <p><strong>Sınav Giriş Kuralları:</strong> Sınav salonunda en geç 30 dakika önce hazır bulunmanız gerekmektedir.</p>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

export default function Dashboard({
  initialAnnouncement,
  initialHistory,
  initialLastChecked,
  initialRedisType
}: DashboardProps) {
  // Scraped Data State
  const [announcement, setAnnouncement] = useState<Announcement>(initialAnnouncement);
  const [history, setHistory] = useState<Announcement[]>(initialHistory || []);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement>(initialAnnouncement);
  const [lastChecked, setLastChecked] = useState<string>(initialLastChecked);
  const [redisType, setRedisType] = useState<string>(initialRedisType);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setActiveAnnouncement(announcement);
  }, [announcement]);

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

  // Card collapsibility state
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isIosPromptExpanded, setIsIosPromptExpanded] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  // Confirmation state (for registration, course selection, or exam appointment)
  const [isConfirmed, setIsConfirmed] = useState<boolean | null>(null);
  const [announcementType, setAnnouncementType] = useState<'registration' | 'course_selection' | 'exam_appointment' | 'none'>('none');

  // Detect announcement type and corresponding key states
  useEffect(() => {
    if (!activeAnnouncement) return;
    const title = activeAnnouncement.title.toLocaleLowerCase('tr-TR');
    const desc = activeAnnouncement.description.toLocaleLowerCase('tr-TR');

    let type: 'registration' | 'course_selection' | 'exam_appointment' | 'none' = 'none';

    if (title.includes('e-sınav randevu') || desc.includes('e-sınav randevu') ||
        title.includes('e-sinav randevu') || desc.includes('e-sinav randevu') ||
        title.includes('sınav randevusu') || desc.includes('sınav randevusu') ||
        title.includes('sinav randevusu') || desc.includes('sinav randevusu')) {
      type = 'exam_appointment';
    } else if (title.includes('ders seçimi') || desc.includes('ders seçimi') ||
               title.includes('ders secimi') || desc.includes('ders secimi') ||
               title.includes('ders seçme') || desc.includes('ders seçme') ||
               title.includes('ders secme') || desc.includes('ders secme')) {
      type = 'course_selection';
    } else if (title.includes('kayıt') || desc.includes('kayıt') ||
               title.includes('kayit') || desc.includes('kayit')) {
      type = 'registration';
    }

    setAnnouncementType(type);

    if (typeof window !== 'undefined' && activeAnnouncement?.id && type !== 'none') {
      let storageKey = '';
      if (type === 'registration') storageKey = `aol_registered_id_${activeAnnouncement.id}`;
      else if (type === 'course_selection') storageKey = `aol_course_selected_id_${activeAnnouncement.id}`;
      else if (type === 'exam_appointment') storageKey = `aol_appointment_taken_id_${activeAnnouncement.id}`;

      if (storageKey) {
        setIsConfirmed(localStorage.getItem(storageKey) === 'true');
      } else {
        setIsConfirmed(null);
      }
    } else {
      setIsConfirmed(null);
    }
  }, [activeAnnouncement]);


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

  // 1.5. Handle URL action confirmations (e.g. from push notifications action buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const queryParams = new URLSearchParams(window.location.search);
    const action = queryParams.get('action');
    const key = queryParams.get('key');
    const val = queryParams.get('val');

    if (action === 'confirm-tag' && key && val) {
      console.log(`URL action confirm-tag detected: key=${key}, val=${val}`);
      
      const processUrlAction = async () => {
        const checkAndApply = async () => {
          const OneSignal = (window as any).OneSignal;
          if (OneSignal) {
            try {
              // 1. Add tag to OneSignal
              if (OneSignal.User && typeof OneSignal.User.addTag === 'function') {
                await OneSignal.User.addTag(key, val);
                console.log(`URL Action: OneSignal Tag Registered: ${key} = ${val}`);
              } else if (typeof OneSignal.sendTag === 'function') {
                await OneSignal.sendTag(key, val);
              }

              // 2. Cache in LocalStorage
              let storageKey = '';
              if (key === 'kayit_yenilendi_id') storageKey = `aol_registered_id_${val}`;
              else if (key === 'ders_secildi_id') storageKey = `aol_course_selected_id_${val}`;
              else if (key === 'randevu_alindi_id') storageKey = `aol_appointment_taken_id_${val}`;

              if (storageKey) {
                localStorage.setItem(storageKey, 'true');
                if (activeAnnouncement && activeAnnouncement.id === val) {
                  setIsConfirmed(true);
                }
              }

              // 3. Clear query parameters from URL without reloading page
              const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.replaceState({ path: newUrl }, '', newUrl);

              alert('Harika! Eyleminiz başarıyla onaylandı ve kaydedildi. 🌸');
              return true;
            } catch (err) {
              console.error('Error applying URL action:', err);
            }
          }
          return false;
        };

        if (!(await checkAndApply())) {
          let attempts = 0;
          const interval = setInterval(async () => {
            attempts++;
            if (await checkAndApply() || attempts > 10) {
              clearInterval(interval);
            }
          }, 1000);
        }
      };

      processUrlAction();
    }
  }, [activeAnnouncement, announcementType]);

  // 1.75. Listen to cross-tab storage changes to synchronize confirm states
  useEffect(() => {
    const handleStorageChange = () => {
      if (activeAnnouncement?.id && announcementType !== 'none') {
        const keys = getKeysForType(announcementType);
        if (keys.storageKey) {
          setIsConfirmed(localStorage.getItem(keys.storageKey) === 'true');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeAnnouncement, announcementType]);

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

          // Sync server tags to local cache for self-healing
          syncOneSignalTagsToLocal();

          // Listen to changes
          OneSignal.Notifications.addEventListener('permissionChange', (permissionState: any) => {
            console.log('OneSignal Permission Change:', permissionState);
            updatePushStatus();
          });

          // Listen to subscription changes (v16+)
          if (OneSignal.User && OneSignal.User.PushSubscription) {
            OneSignal.User.PushSubscription.addEventListener('change', () => {
              console.log('OneSignal Subscription Change event triggered');
              updatePushStatus();
            });
          }

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
      // Primary: OneSignal v16 API. Fallback: v15 API. Last resort: 'default'.
      const currentPermission = OneSignal.Notifications?.permission
        || (typeof OneSignal.getNotificationPermission === 'function'
            ? await OneSignal.getNotificationPermission()
            : undefined);
      
      // Get device push subscription ID
      const subscription = OneSignal.User?.PushSubscription;
      const hasSubscription = !!(subscription && subscription.id);

      // Determine permission state:
      // Priority 1: OneSignal SDK's own permission value (works on all platforms including iOS PWA)
      // Priority 2: Browser's Notification API (only exists in iOS PWA, not normal Safari)
      let permissionState = 'default';

      if (currentPermission === true || currentPermission === 'granted' || hasSubscription) {
        permissionState = 'granted';
      } else if (currentPermission === false || currentPermission === 'denied') {
        permissionState = 'denied';
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        // Fallback to browser Notification API only when OneSignal gives no clear answer
        if (window.Notification.permission === 'denied') {
          permissionState = 'denied';
        } else if (window.Notification.permission === 'granted') {
          permissionState = 'granted';
        }
      }

      setPermission(permissionState);

      // Force explicit OneSignal subscription registration if permission is granted but ID is missing
      if (permissionState === 'granted' && !hasSubscription) {
        console.log('OneSignal: Permission is granted, but subscription ID is missing. Triggering explicit opt-in...');
        try {
          if (OneSignal.User && OneSignal.User.PushSubscription) {
            await OneSignal.User.PushSubscription.optIn();
          }
        } catch (optError) {
          console.error('OneSignal optIn error:', optError);
        }
      }

      if (subscription && subscription.id) {
        setSubscriptionId(subscription.id);
        localStorage.setItem('aol_subscription_id', subscription.id);
        
        // Synced local state with actual optOut status in OneSignal
        const optOutStatus = subscription.optedOut;
        setIsMuted(optOutStatus);
        localStorage.setItem('aol_push_muted', optOutStatus.toString());
      } else {
        // Fallback to cached device subscription ID on iOS/Safari state loss
        const cachedId = localStorage.getItem('aol_subscription_id');
        if (cachedId && (permissionState === 'granted' || (typeof window !== 'undefined' && window.Notification?.permission === 'granted'))) {
          setSubscriptionId(cachedId);
        } else {
          setSubscriptionId('');
        }
      }
    });
  };

  // Helper functions to manage OneSignal tags in a backward compatible way
  const addOneSignalTag = async (key: string, value: string) => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    OneSignal.push(async () => {
      try {
        if (OneSignal.User && typeof OneSignal.User.addTag === 'function') {
          await OneSignal.User.addTag(key, value);
          console.log(`OneSignal tag added (v16): ${key} = ${value}`);
        } else if (typeof OneSignal.sendTag === 'function') {
          await OneSignal.sendTag(key, value);
          console.log(`OneSignal tag added (legacy): ${key} = ${value}`);
        }
      } catch (err) {
        console.error('Error adding OneSignal tag:', err);
      }
    });
  };

  const removeOneSignalTag = async (key: string) => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    OneSignal.push(async () => {
      try {
        if (OneSignal.User && typeof OneSignal.User.removeTag === 'function') {
          await OneSignal.User.removeTag(key);
          console.log(`OneSignal tag removed (v16): ${key}`);
        } else if (typeof OneSignal.deleteTag === 'function') {
          await OneSignal.deleteTag(key);
          console.log(`OneSignal tag removed (legacy): ${key}`);
        }
      } catch (err) {
        console.error('Error removing OneSignal tag:', err);
      }
    });
  };

  const syncOneSignalTagsToLocal = async () => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;

    OneSignal.push(async () => {
      try {
        const tags = OneSignal.User?.getTags ? await OneSignal.User.getTags() : {};
        if (tags && typeof tags === 'object') {
          console.log('OneSignal: server tags fetched for synchronization:', tags);
          const types = ['registration', 'course_selection', 'exam_appointment'];
          types.forEach(t => {
            let tagKey = '';
            let storagePrefix = '';
            if (t === 'registration') {
              tagKey = 'kayit_yenilendi_id';
              storagePrefix = 'aol_registered_id_';
            } else if (t === 'course_selection') {
              tagKey = 'ders_secildi_id';
              storagePrefix = 'aol_course_selected_id_';
            } else if (t === 'exam_appointment') {
              tagKey = 'randevu_alindi_id';
              storagePrefix = 'aol_appointment_taken_id_';
            }

            const tagVal = tags[tagKey];
            if (tagVal) {
              localStorage.setItem(`${storagePrefix}${tagVal}`, 'true');
            }
          });

          // Sync current announcement confirm state
          if (activeAnnouncement?.id && announcementType !== 'none') {
            const keys = getKeysForType(announcementType);
            if (keys.storageKey) {
              setIsConfirmed(localStorage.getItem(keys.storageKey) === 'true');
            }
          }
        }
      } catch (syncError) {
        console.error('OneSignal: tag synchronization failed:', syncError);
      }
    });
  };

  const getKeysForType = (type: 'registration' | 'course_selection' | 'exam_appointment' | 'none') => {
    switch (type) {
      case 'registration':
        return { tagKey: 'kayit_yenilendi_id', storageKey: `aol_registered_id_${activeAnnouncement.id}` };
      case 'course_selection':
        return { tagKey: 'ders_secildi_id', storageKey: `aol_course_selected_id_${activeAnnouncement.id}` };
      case 'exam_appointment':
        return { tagKey: 'randevu_alindi_id', storageKey: `aol_appointment_taken_id_${activeAnnouncement.id}` };
      default:
        return { tagKey: '', storageKey: '' };
    }
  };

  const markAsConfirmed = async () => {
    if (!activeAnnouncement?.id || announcementType === 'none') return;
    const keys = getKeysForType(announcementType);
    if (!keys.storageKey || !keys.tagKey) return;
    
    try {
      localStorage.setItem(keys.storageKey, 'true');
      setIsConfirmed(true);
      await addOneSignalTag(keys.tagKey, activeAnnouncement.id);
    } catch (err) {
      console.error('Failed to mark as confirmed:', err);
    }
  };

  const markAsUnconfirmed = async () => {
    if (!activeAnnouncement?.id || announcementType === 'none') return;
    const keys = getKeysForType(announcementType);
    if (!keys.storageKey || !keys.tagKey) return;
    
    try {
      localStorage.removeItem(keys.storageKey);
      setIsConfirmed(false);
      await removeOneSignalTag(keys.tagKey);
    } catch (err) {
      console.error('Failed to mark as unconfirmed:', err);
    }
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

  // 3.5. Complete registration (especially for iOS Safari standalone PWA user gesture bypass)
  const completeRegistration = async () => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) {
      setTestPushResult({
        success: false,
        message: 'OneSignal yüklenirken hata oluştu. Lütfen sayfayı yenileyin veya reklam engelleyicinizi kapatın.'
      });
      return;
    }

    setTestPushLoading(true);
    setTestPushResult(null);

    OneSignal.push(async () => {
      try {
        console.log('User gesture: triggering optIn and requestPermission to resolve iOS registration...');
        
        // 1. Request permission again (safely, since already granted, this ensures push subscription generation is kicked off in iOS Safari)
        await OneSignal.Notifications.requestPermission();
        
        // 2. Explicitly opt in
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          await OneSignal.User.PushSubscription.optIn();
        }
        
        // Wait a short moment for the subscription to register
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // 3. Update the push status to read the new subscription ID
        await updatePushStatus();
        
        // Get the latest status
        const sub = OneSignal.User?.PushSubscription;
        if (sub && sub.id) {
          setTestPushResult({
            success: true,
            message: 'Tebrikler! Bildirim kaydı başarıyla tamamlandı. Aygıt kimliği alındı. Artık test bildirimi gönderebilirsiniz.'
          });
        } else {
          // If still not registered, let's try one more fallback to see if we can read it from SDK
          const currentId = OneSignal.User?.PushSubscription?.id;
          if (currentId) {
            setSubscriptionId(currentId);
            localStorage.setItem('aol_subscription_id', currentId);
            setTestPushResult({
              success: true,
              message: 'Bildirim kaydı tamamlandı! Aygıt kimliği güncellendi.'
            });
          } else {
            setTestPushResult({
              success: false,
              message: 'Aygıt kimliği henüz üretilemedi. iOS bazen arka planda kaydı geciktirebilir. Lütfen birkaç saniye sonra "Bildirim Kaydını Tamamla" veya "Test Bildirimi Gönder" butonuna tekrar basarak veya sayfayı yenileyerek deneyin.'
            });
          }
        }
      } catch (err: any) {
        console.error('Error in completeRegistration:', err);
        setTestPushResult({
          success: false,
          message: `Kayıt tamamlanamadı: ${err.message || err}`
        });
      } finally {
        setTestPushLoading(false);
      }
    });
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
    let activeSubId = subscriptionId;
    if (!activeSubId && typeof window !== 'undefined') {
      activeSubId = localStorage.getItem('aol_subscription_id') || '';
    }

    if (!activeSubId) {
      setTestPushResult({
        success: false,
        message: 'Aygıt kimliği bulunamadı. Lütfen bildirimlerin açık olduğundan emin olun.'
      });
      return;
    }

    setTestPushLoading(true);
    setTestPushResult(null);

    try {
      const res = await fetch('/api/send-test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId: activeSubId })
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-pink-400/20 blur-[80px] sm:blur-[120px] pointer-events-none -z-10" />

      {/* Page Title Header (Without card container) */}
      <div className="flex items-center gap-3 select-none">
        <HelloKittyBow />
        <h1 className="text-2xl font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">AOL Duyuru Takip</h1>
      </div>

      {/* Settings Row */}
      <div className={`grid gap-6 ${showIosPrompt ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Notification Settings Card */}
        <div className="bg-white/70 border border-pink-200/50 rounded-3xl backdrop-blur-md shadow-xl shadow-pink-100/40 overflow-hidden transition-all duration-300">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-pink-50/20 transition-colors text-left cursor-pointer"
          >
            <h2 className="text-xs font-semibold tracking-wider text-pink-500 uppercase flex items-center gap-1 select-none">
              <span>BİLDİRİM AYARLARI</span>
              <span>🎀</span>
            </h2>
            {isSettingsExpanded ? (
              <ChevronUp className="w-4 h-4 text-pink-400 transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 text-pink-400 transition-transform" />
            )}
          </button>
          
          {/* Collapsible Content */}
          {isSettingsExpanded && (
            <div className="px-6 pb-6 space-y-5 animate-fade-in border-t border-pink-100/40 pt-5">
              {/* Status Visualizer */}
              <div className="flex flex-col items-center justify-center p-6 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-3">
                <div className={`p-4 rounded-full ${
                  permission === 'granted'
                    ? (subscriptionId 
                        ? 'bg-pink-100 text-pink-600 border border-pink-200 shadow-md shadow-pink-100/50'
                        : 'bg-amber-100 text-amber-600 border border-amber-200 shadow-md shadow-amber-100/50 animate-pulse')
                    : 'bg-zinc-50 text-zinc-400 border border-zinc-200/60'
                }`}>
                  {permission === 'granted' ? (
                    subscriptionId ? (
                      <Bell className="w-8 h-8 animate-bounce" />
                    ) : (
                      <BellOff className="w-8 h-8 text-amber-500" />
                    )
                  ) : (
                    <BellOff className="w-8 h-8" />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs text-zinc-500">Durum</div>
                  <div className="text-sm font-bold text-pink-650">
                    {permission === 'granted'
                      ? (subscriptionId ? 'Bildirimler Aktif' : 'Kurulum Gerekli ⚠️')
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
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 active:scale-[0.98] transition-all text-white font-medium py-3 px-4 rounded-2xl shadow-lg shadow-pink-500/25 cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    Bildirimleri Aç
                  </button>
                ) : !subscriptionId ? (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-amber-50/60 border border-amber-200/30 rounded-2xl text-[11px] text-amber-700 leading-relaxed">
                      <strong>⚠️ Aygıt Kaydı Tamamlanamadı:</strong> İzinler aktif görünmesine rağmen cihazınız sisteme kaydedilemedi. iOS/Safari Web Push kuralları gereği, kaydı tamamlamak için aşağıdaki butona basmalısınız.
                    </div>
                    <button
                      onClick={completeRegistration}
                      disabled={testPushLoading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all text-white font-medium py-3 px-4 rounded-2xl shadow-lg shadow-amber-500/25 cursor-pointer"
                    >
                      {testPushLoading ? (
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <BellRing className="w-4 h-4 animate-pulse" />
                      )}
                      Bildirim Kaydını Tamamla
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Send Test Notification Button */}
                    <button
                      onClick={sendTestNotification}
                      disabled={testPushLoading}
                      className="w-full flex items-center justify-center gap-2 bg-pink-50 hover:bg-pink-100/80 text-pink-600 border border-pink-200/50 font-medium py-3 px-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {testPushLoading ? (
                        <span className="w-4 h-4 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
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
                <div className={`p-4 rounded-2xl text-xs flex gap-2 border ${
                  testPushResult.success 
                    ? 'bg-pink-50 text-pink-700 border-pink-200/40' 
                    : 'bg-red-50 text-red-700 border-red-200/40'
                }`}>
                  <Info className="w-4 h-4 shrink-0 text-pink-500" />
                  <p>{testPushResult.message}</p>
                </div>
              )}

              {/* Subscription Key Debug Card */}
              {subscriptionId && (
                <div className="bg-pink-50/40 border border-pink-100 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span>OneSignal Aygıt Kimliği:</span>
                    <button
                      onClick={() => copyToClipboard(subscriptionId)}
                      className="hover:text-pink-600 p-1 rounded transition-colors text-zinc-400"
                      title="Kimliği Kopyala"
                    >
                      {copied ? 'Kopyalandı!' : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono text-pink-700 break-all select-all bg-white/70 p-2.5 rounded-xl border border-pink-100/80 leading-normal">
                    {subscriptionId}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* iPhone Safari PWA Installation Card */}
        {showIosPrompt && (
          <div className="bg-white/70 border border-pink-200/50 rounded-3xl backdrop-blur-md shadow-xl shadow-pink-100/40 overflow-hidden transition-all duration-300">
            {/* Collapsible Header */}
            <button
              onClick={() => setIsIosPromptExpanded(!isIosPromptExpanded)}
              className="w-full flex items-center justify-between p-6 hover:bg-pink-50/20 transition-colors text-left cursor-pointer"
            >
              <h2 className="text-xs font-semibold tracking-wider text-pink-500 uppercase flex items-center gap-1.5 select-none">
                <Share2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>IPHONE SAFARI KURULUMU</span>
                <span>🎀</span>
              </h2>
              {isIosPromptExpanded ? (
                <ChevronUp className="w-4 h-4 text-pink-400 transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-pink-400 transition-transform" />
              )}
            </button>

            {/* Collapsible Content */}
            {isIosPromptExpanded && (
              <div className="px-6 pb-6 space-y-4 animate-fade-in border-t border-pink-100/40 pt-5 text-zinc-700">
                <p className="text-xs text-zinc-650 leading-relaxed">
                  Apple güvenlik politikası gereği, iPhone cihazlarda Web Push bildirimleri alabilmek için bu siteyi 
                  <strong> Ana Ekrana Eklemeniz</strong> gerekmektedir.
                </p>
                <div className="bg-white/60 p-3 rounded-2xl text-xs space-y-1.5 text-zinc-700 border border-pink-100">
                  <p>1. Safari çubuğundaki <strong className="text-pink-600">"Paylaş" (Share) 📤</strong> butonuna dokunun.</p>
                  <p>2. Menüyü kaydırıp <strong className="text-pink-600">"Ana Ekrana Ekle" (Add to Home Screen) ➕</strong> seçeneğine tıklayın.</p>
                  <p>3. Ana ekrana eklenen uygulamayı açıp alttaki <strong>"Bildirimleri Aç"</strong> butonunu aktif edin.</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Grid: Announcement display & Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: CountdownTimer */}
        <div className="md:col-span-1">
          <CountdownTimer />
        </div>

        {/* Right Column: Latest Announcement Details */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-white/70 border border-pink-200/50 rounded-3xl p-6 space-y-6 backdrop-blur-md shadow-xl shadow-pink-100/40">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-pink-100">
              <div className="space-y-1">
                <h2 className="text-xs font-semibold tracking-wider text-pink-500 uppercase flex items-center gap-1 select-none">
                  <span>MEB DUYURU DETAYI</span>
                  <span>🎀</span>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="bg-pink-50/70 text-zinc-550 border border-pink-200/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 select-none">
                  Kontrol: <strong className="text-pink-650">{lastChecked}</strong>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerManualCheck();
                    }}
                    disabled={isRefreshing}
                    className="p-1 rounded hover:bg-pink-100/50 text-pink-600 disabled:opacity-50 cursor-pointer"
                    title="Şimdi Kontrol Et"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-pink-500' : ''}`} />
                  </button>
                </span>
                <span className="bg-pink-50 text-pink-600 border border-pink-200/30 px-2.5 py-1 rounded-lg select-none">
                  Yayın: {activeAnnouncement.publishDate}
                </span>
                <span className="bg-rose-50 text-rose-600 border border-rose-200/30 px-2.5 py-1 rounded-lg select-none">
                  Güncelleme: {activeAnnouncement.updateDate}
                </span>
              </div>
            </div>

            {/* Title card with modern layout */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-zinc-800 leading-snug">
                  {activeAnnouncement.title}
                </h3>
                {activeAnnouncement.deadline && (
                  <AnnouncementCountdown deadlineStr={activeAnnouncement.deadline} />
                )}
              </div>
              <div 
                className="text-sm text-zinc-650 leading-relaxed whitespace-pre-wrap animate-fade-in"
                dangerouslySetInnerHTML={{ __html: activeAnnouncement.description }}
              />
            </div>

            {/* Attached Files & Guides Section */}
            {activeAnnouncement.files && activeAnnouncement.files.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-pink-500 tracking-wider uppercase flex items-center gap-1.5 select-none">
                  <FileText className="w-3.5 h-3.5 text-pink-400" />
                  Eğitim ve Kayıt Kılavuzları
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeAnnouncement.files.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 bg-pink-50/20 border border-pink-100 rounded-2xl hover:bg-pink-100/40 hover:border-pink-300 active:scale-[0.99] transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-xl group-hover:bg-pink-200 group-hover:text-pink-700 transition-colors">
                          <FileText className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="text-xs font-medium text-zinc-700 group-hover:text-pink-600 transition-colors truncate">
                          {file.title}
                        </span>
                      </div>
                      <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-pink-600 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Inline status confirmation controls for reminders */}
            {announcementType !== 'none' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-pink-50/20 border border-pink-100 rounded-2xl animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-pink-600 flex items-center gap-1.5 select-none">
                    <span>
                      {announcementType === 'registration'
                        ? 'Kayıt Yenileme Durumu ⏳'
                        : announcementType === 'course_selection'
                        ? 'Ders Seçimi Durumu 📚'
                        : 'e-Sınav Randevu Durumu 🗓️'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-555 leading-relaxed">
                    {announcementType === 'registration'
                      ? 'Bu duyuru kayıt yenileme dönemini belirtiyor. İşleminizi tamamladınız mı?'
                      : announcementType === 'course_selection'
                      ? 'Bu duyuru ders seçme işlemlerini belirtiyor. Ders seçiminizi yaptınız mı?'
                      : 'Bu duyuru e-Sınav randevularını belirtiyor. Randevunuzu aldınız mı?'}
                  </p>
                </div>
                <button
                  onClick={isConfirmed ? markAsUnconfirmed : markAsConfirmed}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 select-none ${
                    isConfirmed
                      ? 'bg-pink-100/75 text-pink-700 border border-pink-200'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/15'
                  }`}
                >
                  {isConfirmed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
                      <span>Evet, Tamamladım</span>
                    </>
                  ) : (
                    <span>İşlemi Tamamladım</span>
                  )}
                </button>
              </div>
            )}

            {/* Official Webpage action button */}
            <a
              href={activeAnnouncement.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-pink-50/50 text-zinc-700 hover:text-pink-650 border border-pink-200/50 py-3 px-5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] w-full shadow-sm"
            >
              Resmi MEB Duyuru Sayfasına Git
              <ExternalLink className="w-4 h-4" />
            </a>

          </div>
        </div>

      </div>

      {/* Inbox / Notification History Section */}
      {history && history.length > 0 && (
        <div className="bg-white/70 border border-pink-200/50 rounded-3xl p-6 backdrop-blur-md shadow-xl shadow-pink-100/40 space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-100 pb-3 select-none">
            <BellRing className="w-5 h-5 text-pink-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-zinc-800">Bildirim Geçmişi (Gelen Kutusu) 🎀</h3>
              <p className="text-[10px] text-zinc-500">Sisteme daha önce gönderilen son 5 duyuru ve bildirim akışı</p>
            </div>
          </div>

          <div className="divide-y divide-pink-100/40 space-y-1">
            {history.map((item) => {
              const isActive = activeAnnouncement?.id === item.id;
              return (
                <div 
                  key={item.id}
                  onClick={() => setActiveAnnouncement(item)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl transition-all cursor-pointer group text-left ${
                    isActive
                      ? 'bg-pink-50/60 border border-pink-200/40 shadow-sm'
                      : 'hover:bg-pink-50/20 border border-transparent'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-md font-semibold shrink-0 select-none">
                        {item.publishDate}
                      </span>
                      {item.deadline && (
                        <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-semibold shrink-0 flex items-center gap-0.5 select-none">
                          <span>⏳ Son Tarihli</span>
                        </span>
                      )}
                    </div>
                    <h4 className={`text-xs font-bold truncate pr-4 ${
                      isActive ? 'text-pink-700 font-extrabold' : 'text-zinc-700 group-hover:text-pink-600 transition-colors'
                    }`}>
                      {item.title}
                    </h4>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAnnouncement(item);
                    }}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-pink-200/50 text-pink-700'
                        : 'bg-white hover:bg-pink-100/50 text-zinc-650 hover:text-pink-600 border border-pink-200/30'
                    }`}
                  >
                    {isActive ? 'Gösteriliyor 🎀' : 'Detayları Gör'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Informative Footer */}
      <footer className="text-center text-xs text-pink-650/70 pt-6 space-y-2 border-t border-pink-200/50">
        <p>© 2026 MEB AOL Duyuru Takip PWA uygulaması. 🎀</p>
        <p className="max-w-md mx-auto leading-relaxed text-zinc-500">
          Bu uygulama MEB sitesini her 15 dakikada bir kontrol eder ve güncellemeleri iPhone / Android PWA 
          cihazlarınıza anında iletir.
        </p>
      </footer>

      {/* Floating looping Hello Kitty GIF in the bottom right corner */}
      <div className="fixed bottom-4 right-4 z-50 w-20 h-20 sm:w-28 sm:h-28 pointer-events-none select-none drop-shadow-[0_4px_12px_rgba(244,63,94,0.2)] animate-bounce" style={{ animationDuration: '4s' }}>
        <img 
          src="https://media.tenor.com/y_DklcOGDqYAAAAi/hello-kitty.gif" 
          alt="Hello Kitty Sticker"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

    </div>
  );
}
