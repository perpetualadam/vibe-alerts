'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/seo/site';
import DashboardNav from '@/components/dashboard/DashboardNav';
import MobileBottomNav from '@/components/dashboard/MobileBottomNav';
import PwaRegister from '@/components/pwa/PwaRegister';
import { useState } from 'react';

function StatusBadge({ active }) {
  if (active == null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/**
 * Shared dashboard chrome — sticky header, desktop nav chips, mobile bottom tabs,
 * toast, PWA registration, safe-area padding.
 */
export default function DashboardShell({
  title,
  subtitle,
  email,
  isActive,
  toast,
  maxWidthClass = 'max-w-5xl',
  headerActions,
  className = '',
  headerClassName = '',
  mutedClassName = 'text-vibe-muted hover:text-white',
  children,
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className={`min-h-screen bg-vibe-bg pb-20 md:pb-0 ${className}`.trim()}>
      <PwaRegister />

      {toast && (
        <div
          role="status"
          className={`fixed top-[max(1rem,env(safe-area-inset-top))] right-3 left-3 sm:left-auto z-[60] px-4 py-3 rounded-lg text-sm font-medium shadow-lg sm:max-w-sm ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white'
              : toast.type === 'success'
                ? 'bg-emerald-500/90 text-white'
                : 'bg-vibe-surface text-white ring-1 ring-vibe-border'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header
        className={`border-b border-vibe-border bg-vibe-bg/80 backdrop-blur-lg sticky top-0 z-40 pt-[env(safe-area-inset-top)] ${headerClassName}`.trim()}
      >
        <div
          className={`${maxWidthClass} mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-start sm:items-center justify-between gap-3`}
        >
          <div className="min-w-0">
            <Link
              href="/"
              className={`text-xs sm:text-sm transition-colors ${mutedClassName}`}
            >
              ← {SITE.name}
            </Link>
            <h1 className="text-lg sm:text-xl font-bold mt-0.5 sm:mt-1 truncate">{title}</h1>
            {(subtitle || email) && (
              <p
                className={`text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md ${mutedClassName.split(' ')[0]}`}
              >
                {subtitle || email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {headerActions}
            <StatusBadge active={isActive} />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`text-xs transition-colors disabled:opacity-50 ${mutedClassName}`}
            >
              {loggingOut ? '…' : 'Sign out'}
            </button>
          </div>
        </div>
        <div className="hidden md:block">
          <DashboardNav maxWidthClass={maxWidthClass} />
        </div>
      </header>

      <main className={`${maxWidthClass} mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8`}>
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
