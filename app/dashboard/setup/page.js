'use client';

import Link from 'next/link';
import { useState } from 'react';
import DashboardNav from '@/components/dashboard/DashboardNav';
import IntegrationWizard from '@/components/dashboard/setup/IntegrationWizard';
import { createClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/seo/site';

export default function SetupWizardPage() {
  const [toast, setToast] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-vibe-bg">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
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

      <header className="border-b border-vibe-border bg-vibe-bg/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-vibe-muted hover:text-white transition-colors">
              ← {SITE.name}
            </Link>
            <h1 className="text-xl font-bold mt-1">Integration Wizard</h1>
            <p className="text-sm text-vibe-muted">
              Connect your website in a few guided steps
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs text-vibe-muted hover:text-white transition-colors disabled:opacity-50"
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        <DashboardNav />
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <p className="text-sm text-vibe-muted max-w-2xl">
          Choose your platform, copy credentials, follow tailored instructions, then test the
          connection before marking setup complete.
        </p>
        <IntegrationWizard onToast={showToast} />
      </main>
    </div>
  );
}
