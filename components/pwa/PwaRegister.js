'use client';

import { useEffect } from 'react';

/**
 * Registers the VibeAlerts service worker (dashboard PWA).
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PWA_DEV !== '1') {
      // Avoid stale SW during local Next HMR unless explicitly enabled.
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (err) {
        console.warn('Service worker registration failed', err);
      }
    };

    register();
  }, []);

  return null;
}
