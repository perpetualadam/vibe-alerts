import Link from 'next/link';
import { SITE } from '@/lib/seo/site';
import { COMPLIANCE_PAGES, getSupportEmail } from '@/lib/legal/site';

export default function MarketingFooter() {
  const supportEmail = getSupportEmail();

  return (
    <footer className="border-t border-vibe-border py-10">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-white">{SITE.name}</p>
            <p className="text-vibe-muted leading-relaxed">{SITE.description}</p>
            <p className="text-vibe-muted">
              Customer support:{' '}
              <a href={`mailto:${supportEmail}`} className="text-vibe-accent hover:underline">
                {supportEmail}
              </a>
            </p>
          </div>
          <nav aria-label="Legal and policies" className="space-y-2">
            <p className="font-semibold text-white">Legal &amp; policies</p>
            <ul className="space-y-1 text-vibe-muted">
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
        <p className="text-center text-sm text-vibe-muted">
          © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
