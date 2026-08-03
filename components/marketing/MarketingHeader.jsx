import Link from 'next/link';
import { SITE } from '@/lib/seo/site';
import { getSubscriptionTrialLabel } from '@/lib/stripe/trial';

const navLinks = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
];

export default function MarketingHeader() {
  const trialLabel = getSubscriptionTrialLabel();

  return (
    <header className="sticky top-0 z-50 border-b border-vibe-border/80 bg-vibe-bg/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="group flex flex-col min-w-0">
          <span className="font-bold text-lg tracking-tight group-hover:text-white transition-colors">
            {SITE.name}
          </span>
          <span className="text-[11px] text-vibe-muted hidden sm:block">{SITE.tagline}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm text-vibe-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-vibe-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/login" className="btn-primary text-sm ml-1">
            {trialLabel ? 'Start free trial' : 'Get started'}
          </Link>
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <Link href="/pricing" className="text-sm text-vibe-muted hover:text-white px-2 py-1">
            Pricing
          </Link>
          <Link href="/login" className="btn-primary text-sm px-3 py-2">
            {trialLabel ? 'Try free' : 'Start'}
          </Link>
        </div>
      </div>
    </header>
  );
}
