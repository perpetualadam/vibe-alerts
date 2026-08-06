'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getSubscriptionTrialLabel } from '@/lib/stripe/trial';
import { getSubscriptionPriceLabel } from '@/lib/legal/site';

/** Only allow same-origin relative paths (blocks open redirects). */
function safeNextPath(value) {
  if (!value || typeof value !== 'string') return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [supabase, setSupabase] = useState(null);
  const [nextPath, setNextPath] = useState('/dashboard');
  const router = useRouter();
  const trialLabel = getSubscriptionTrialLabel();
  const priceLabel = getSubscriptionPriceLabel();

  useEffect(() => {
    setSupabase(createClient());
    const params = new URLSearchParams(window.location.search);
    setNextPath(safeNextPath(params.get('next')));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      router.push(nextPath);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setMessage('Check your email to confirm your account, then sign in.');
    }

    setLoading(false);
  };

  return (
    <main className="marketing-page min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-5">
        <Link href="/" className="font-bold text-lg hover:text-white transition-colors">
          ← Back to VibeAlerts
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-vibe-muted leading-relaxed">
              {mode === 'signin'
                ? 'Sign in to manage webhooks, alerts, and billing.'
                : trialLabel
                  ? `${trialLabel}, then ${priceLabel}. Card required — cancel anytime before the trial ends.`
                  : `Subscribe from your dashboard (${priceLabel}).`}
            </p>
          </div>

          <div className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-vibe-muted mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-vibe-muted">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <Link
                      href="/login/forgot-password"
                      className="text-xs text-vibe-accent hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
                />
              </div>

              {message && (
                <p
                  className={`text-sm rounded-lg px-3 py-2 ${
                    message.includes('Check your email')
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                  }`}
                  role="status"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !supabase}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm text-vibe-muted">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setMessage('');
                }}
                className="text-vibe-accent hover:underline font-medium"
              >
                {mode === 'signin' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-vibe-muted leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-vibe-accent hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-vibe-accent hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
