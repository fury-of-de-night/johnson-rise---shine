import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!email.trim()) { setMsg('Email is required.'); return; }
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/admin/reset`
          : 'https://johnson-rise-shine.vercel.app/admin/reset',
      });
      if (error) {
        setMsg(error.message || 'Failed to send reset link.');
      } else {
        setMsg('If account exists, reset link sent. Check your email.');
        setEmail('');
      }
    } catch {
      setMsg('Failed to send reset link.');
    }
    setSending(false);
  };

  return (
    <>
      <Head><title>Forgot Password — Admin</title></Head>
      <main className="min-h-screen bg-green-50">
        <div className="max-w-md mx-auto px-6 py-24">
          <h1 className="font-serif text-3xl text-forest mb-6">Forgot Password</h1>
          <form onSubmit={handleReset} className="space-y-4 bg-white p-6 rounded-2xl shadow-md border border-green-100">
            <input type="email" placeholder="admin@johnsonriseshine.gy" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
            <button type="submit" disabled={sending} className={`w-full py-2.5 rounded-full text-white transition ${sending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{sending ? 'Sending...' : 'Send Reset Link'}</button>
            <a href="/admin" className="block text-xs text-forest hover:underline">Back to login</a>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </form>
        </div>
      </main>
    </>
  );
}
