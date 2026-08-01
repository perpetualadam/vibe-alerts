import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <p className="text-vibe-accent text-sm font-medium tracking-widest uppercase">
            VibeAlerts
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Website forms → Telegram alerts
          </h1>
          <p className="text-vibe-muted text-lg">
            Works with WordPress, Wix, Webflow, or any site that can POST JSON.
            No SMS compliance headaches.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors"
        >
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}
