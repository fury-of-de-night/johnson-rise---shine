import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

export default function AdminResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setMsg('Please log in or use the reset link from your email.'); }
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!newPassword || newPassword.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirm) { setMsg('Passwords do not match.'); return; }
    setSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setMsg(error.message || 'Failed to update password.'); }
      else { setMsg('Password updated. Returning to login...'); setTimeout(() => window.location.href = '/admin', 1500); }
    } catch { setMsg('Failed to update password.'); }
    setSending(false);
  };

  return (
    <>
      <Head><title>Reset Password — Admin</title></Head>
      <main className="min-h-screen bg-green-50">
        <div className="max-w-md mx-auto px-6 py-24">
          <h1 className="font-serif text-3xl text-forest mb-6">Set New Password</h1>
          <form onSubmit={handleUpdate} className="space-y-4 bg-white p-6 rounded-2xl shadow-md border border-green-100">
            <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
            <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
            <button type="submit" disabled={sending} className={`w-full py-2.5 rounded-full text-white transition ${sending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{sending ? 'Updating...' : 'Update Password'}</button>
            <a href="/admin" className="block text-xs text-forest hover:underline">Back to login</a>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </form>
        </div>
      </main>
    </>
  );
}
