'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Overview', match: (path) => path === '/dashboard' },
  {
    href: '/dashboard/setup',
    label: 'Setup Wizard',
    match: (path) => path.startsWith('/dashboard/setup'),
  },
  {
    href: '/dashboard/notifications',
    label: 'Notifications',
    match: (path) => path.startsWith('/dashboard/notifications'),
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    match: (path) => path.startsWith('/dashboard/analytics'),
  },
];

/**
 * Secondary nav for dashboard sections — desktop tabs + mobile scroll chips.
 */
export default function DashboardNav() {
  const pathname = usePathname() || '/dashboard';

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-vibe-border bg-vibe-bg/60"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <ul className="flex gap-1 overflow-x-auto py-2 -mb-px scrollbar-none">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-vibe-muted hover:text-white hover:bg-white/5'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
