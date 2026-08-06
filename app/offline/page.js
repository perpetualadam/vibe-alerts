import Link from 'next/link';
import { SITE } from '@/lib/seo/site';

export const metadata = {
  title: `Offline | ${SITE.name}`,
  robots: { index: false, follow: false },
};

/** Minimal offline fallback for the PWA service worker. */
export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-vibe-bg text-white">
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm font-semibold text-vibe-accent">{SITE.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
        <p className="text-sm text-vibe-muted leading-relaxed">
          Cached notification logs may still be available on the Notifications page. Reconnect to
          sync the latest activity.
        </p>
        <Link
          href="/dashboard/notifications"
          className="inline-flex px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-sm font-medium"
        >
          Open Notifications
        </Link>
      </div>
    </main>
  );
}
