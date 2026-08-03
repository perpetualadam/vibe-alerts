import Link from 'next/link';
import { SITE } from '@/lib/seo/site';
import { COMPLIANCE_PAGES, getSupportEmail } from '@/lib/legal/site';

export default function MarketingFooter() {
  const supportEmail = getSupportEmail();

  return (
    <footer className="border-t border-vibe-border mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3 lg:col-span-1">
            <p className="font-semibold text-white text-base">{SITE.name}</p>
            <p className="text-vibe-muted leading-relaxed max-w-sm">{SITE.description}</p>
          </div>
          <nav aria-label="Product" className="space-y-3">
            <p className="font-semibold text-white">Product</p>
            <ul className="space-y-2 text-vibe-muted">
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign in / Create account
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact support
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Legal and policies" className="space-y-3">
            <p className="font-semibold text-white">Legal &amp; policies</p>
            <ul className="space-y-2 text-vibe-muted">
              {COMPLIANCE_PAGES.map((page) => (
                <li key={page.href}>
                  <Link href={page.href} className="hover:text-white transition-colors">
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="pt-6 border-t border-vibe-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-vibe-muted">
          <p>
            Support:{' '}
            <a href={`mailto:${supportEmail}`} className="text-vibe-accent hover:underline">
              {supportEmail}
            </a>
          </p>
          <p>© {new Date().getFullYear()} {SITE.legalName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
