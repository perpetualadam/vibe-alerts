'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [supabase, setSupabase] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setSupabase(createClient());
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
      router.push('/dashboard');
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
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md glass rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">VibeAlerts</h1>
          <p className="text-sm text-vibe-muted">Sign in to manage your webhook alerts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-vibe-muted mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm text-vibe-muted">Password</label>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
            />
          </div>

          {message && (
            <p className="text-sm text-amber-400">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading || !supabase}
            className="w-full py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-vibe-muted">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-vibe-accent hover:underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  );
}
