'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const CURRENT_CLIENT_VERSION = '2026.09.22-dm-v3';
const STORAGE_KEY = 'aol_pwa_app_version';

export default function PWAUpdateManager() {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const performCachePurgeAndReload = async (newVersion?: string) => {
    try {
      setUpdateStatus('Uygulama güncelleniyor... 🔄');

      // 1. Clear all CacheStorage entries
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      }

      // 2. Force update all active Service Workers
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          try {
            await reg.update();
          } catch (e) {
            console.warn('Service worker update error:', e);
          }
        }
      }

      // 3. Save new version in localStorage
      if (newVersion) {
        localStorage.setItem(STORAGE_KEY, newVersion);
      } else {
        localStorage.setItem(STORAGE_KEY, CURRENT_CLIENT_VERSION);
      }

      // 4. Force hard reload with timestamp query to bypass Safari disk cache
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('v_sync', Date.now().toString());
      window.location.replace(currentUrl.toString());
    } catch (err) {
      console.error('Update purge error:', err);
      window.location.reload();
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      const serverVersion = data.version;
      const storedVersion = localStorage.getItem(STORAGE_KEY);

      // If this is an existing user whose stored version doesn't match the server version:
      if (storedVersion && storedVersion !== serverVersion) {
        console.log(`New PWA version detected! Stored: ${storedVersion}, Server: ${serverVersion}. Purging caches...`);
        await performCachePurgeAndReload(serverVersion);
      } else if (!storedVersion) {
        // First time running this version manager: record version
        localStorage.setItem(STORAGE_KEY, serverVersion || CURRENT_CLIENT_VERSION);
      }
    } catch (err) {
      console.warn('Silent version check skipped (network offline or timeout):', err);
    }
  };

  useEffect(() => {
    // Initial check on mount
    checkForUpdates();

    // Re-check when app comes to foreground (critical for iPhone home screen PWAs when unlocked/switched back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    // Expose global updater function for manual buttons
    (window as any).__forcePwaUpdate = () => performCachePurgeAndReload();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  if (!updateStatus) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-pink-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span>{updateStatus}</span>
    </div>
  );
}
