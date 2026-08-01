import Link from 'next/link';
import { SITE } from '@/lib/seo/site';

export default function MarketingHeader() {
  return (
    <header className="border-b border-vibe-border">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg hover:text-white transition-colors">
          {SITE.name}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-vibe-muted hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/contact" className="text-sm text-vibe-muted hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/login" className="text-sm text-vibe-muted hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="text-sm px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
