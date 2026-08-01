'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { buildPasswordResetRedirectUrl } from '@/lib/auth/reset';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage('');

    const redirectTo = buildPasswordResetRedirectUrl(window.location.origin);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md glass rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-sm text-vibe-muted">
            Enter your account email and we&apos;ll send a reset link.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-sm text-vibe-muted">
            <p className="text-emerald-400">
              If an account exists for <strong className="text-white">{email}</strong>, you will
              receive a password reset email shortly.
            </p>
            <p>Check your inbox and spam folder. The link expires after a short time.</p>
            <Link href="/login" className="inline-block text-vibe-accent hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-vibe-muted mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
              />
            </div>

            {message && <p className="text-sm text-amber-400">{message}</p>}

            <button
              type="submit"
              disabled={loading || !supabase}
              className="w-full py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {!sent && (
          <p className="text-center text-sm text-vibe-muted">
            Remember your password?{' '}
            <Link href="/login" className="text-vibe-accent hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
