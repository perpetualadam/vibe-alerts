'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState('');
  const [supabase, setSupabase] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const client = createClient();
    setSupabase(client);

    client.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
      if (!session) {
        setMessage('Reset link invalid or expired. Request a new one.');
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase || !hasSession) return;

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-vibe-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md glass rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm text-vibe-muted">Enter a new password for your account.</p>
        </div>

        {!hasSession ? (
          <div className="space-y-4 text-sm">
            <p className="text-amber-400">{message}</p>
            <Link
              href="/login/forgot-password"
              className="inline-block text-vibe-accent hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm text-vibe-muted mb-1.5">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-vibe-muted mb-1.5">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
              />
            </div>

            {message && <p className="text-sm text-amber-400">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-vibe-muted">
          <Link href="/login" className="text-vibe-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
