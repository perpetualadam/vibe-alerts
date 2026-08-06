'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  {
    href: '/dashboard/rules',
    label: 'Rules',
    match: (path) => path.startsWith('/dashboard/rules'),
  },
  {
    href: '/dashboard/ai',
    label: 'AI Insights',
    match: (path) => path.startsWith('/dashboard/ai'),
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    match: (path) => path.startsWith('/dashboard/billing'),
  },
];

/**
 * Secondary nav for dashboard sections — desktop tabs (phones use MobileBottomNav).
 * @param {{ maxWidthClass?: string }} [props]
 */
export default function DashboardNav({ maxWidthClass = 'max-w-5xl' }) {
  const pathname = usePathname() || '/dashboard';
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.isPlatformAdmin) setShowAdmin(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const links = showAdmin
    ? [
        ...LINKS,
        {
          href: '/dashboard/admin',
          label: 'Admin',
          match: (path) => path.startsWith('/dashboard/admin'),
        },
      ]
    : LINKS;

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-vibe-border bg-vibe-bg/60"
    >
      <div className={`${maxWidthClass} mx-auto px-4 sm:px-6`}>
        <ul className="flex gap-1 overflow-x-auto py-2 -mb-px scrollbar-none">
          {links.map((link) => {
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
