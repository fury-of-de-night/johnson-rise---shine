import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [email, setEmail] = useState('admin@johnsonriseshine.gy');
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [changeMode, setChangeMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSending, setChangeSending] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [businessEmail, setBusinessEmail] = useState('admin@johnsonriseshine.gy');
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      if (document.cookie.includes('jrs-session=')) { setAuth(true); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!auth) return;
    supabase.from('service_requests').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!error && data) {
        const mapped = data.map((r: any) => ({
          ref: r.id ? String(r.id).slice(0, 8).toUpperCase() : 'JRS-?',
          name: r.customer_name || '-',
          phone: r.phone || '-',
          status: r.status || 'pending',
          service: r.service_type || '-',
        }));
        setRequests(mapped);
      }
    });
  }, [auth]);

  const handleForgot = async () => {
    if (!email.trim()) { setMessage('Enter email to send reset link.'); return; }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/admin/reset`
          : 'https://johnson-rise-shine.vercel.app/admin/reset',
      });
      if (error) { setMessage(error.message || 'Failed to send reset link.'); }
      else { setMessage('If account exists, reset link sent. Check your email.'); }
    } catch { setMessage('Failed to send reset link.'); }
    setResetSending(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { setChangeMsg('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setChangeMsg('Passwords do not match.'); return; }
    setChangeSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setChangeMsg(error.message || 'Failed to update password.'); }
      else { setChangeMsg('Password updated.'); setNewPassword(''); setConfirmPassword(''); setTimeout(() => setChangeMsg(''), 3000); }
    } catch { setChangeMsg('Failed to update password.'); }
    setChangeSending(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        setAuth(true);
        document.cookie = 'jrs-session=authenticated; path=/; max-age=86400';
        return;
      }
    } catch {
      // fall through to demo
    }
    // Demo fallback
    if (email === 'admin@johnsonriseshine.gy' && password === 'admin') {
      setAuth(true);
      document.cookie = 'jrs-session=demo; path=/; max-age=86400';
      setMessage('');
    } else {
      setMessage('Invalid credentials. Try admin@johnsonriseshine.gy / admin or use Supabase Auth.');
    }
  };

  const markCompleted = (ref: string) => {
    setRequests((prev) => {
      const next = prev.map((r) => r.ref === ref ? { ...r, status: 'completed' } : r);
      try { localStorage.setItem('jrs-requests', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const exportCSV = () => {
    const rows = requests.map((r) => `${r.ref},${r.name},${r.phone},${r.status || 'pending'},${r.service}`);
    const csv = ['ref,name,phone,status,service', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'requests.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const formatDateGYT = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Guyana' }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => (r.status || 'pending') === filter);

  return (
    <>
      <Head><title>Admin - Johnson Rise & Shine</title></Head>
      <main className="min-h-screen bg-green-50">
        {!auth ? (
          <div className="max-w-md mx-auto px-6 py-24">
            <h1 className="font-serif text-3xl text-forest mb-6">Admin Login</h1>
            <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded-2xl shadow-md border border-green-100">
              {resetMode ? (
                <>
                  <input type="email" placeholder="admin@johnsonriseshine.gy" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <button type="button" disabled={resetSending} onClick={handleForgot} className={`w-full py-2.5 rounded-full text-white transition ${resetSending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{resetSending ? 'Sending...' : 'Send Reset Link'}</button>
                  <button type="button" onClick={() => { setResetMode(false); setResetMsg(''); }} className="w-full text-xs text-forest hover:underline">Back to login</button>
                  {resetMsg && <p className={`text-sm ${resetMsg.includes('sent') ? 'text-green-700' : 'text-red-600'}`}>{resetMsg}</p>}
                </>
              ) : (
                <>
                  <input type="email" placeholder="admin@johnsonriseshine.gy" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <button type="button" onClick={() => setResetMode(true)} className="text-xs text-forest hover:underline">Forgot password?</button>
                </>
              )}
              {changeMode ? (
                <>
                  <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <button type="button" disabled={changeSending} onClick={handleChangePassword} className={`w-full py-2.5 rounded-full text-white transition ${changeSending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{changeSending ? 'Updating...' : 'Update Password'}</button>
                  <button type="button" onClick={() => { setChangeMode(false); setChangeMsg(''); setNewPassword(''); setConfirmPassword(''); }} className="w-full text-xs text-forest hover:underline">Back to login</button>
                  {changeMsg && <p className={`text-sm ${changeMsg.includes('updated') ? 'text-green-700' : 'text-red-600'}`}>{changeMsg}</p>}
                </>
              ) : (
                <button type="button" onClick={() => setChangeMode(true)} className="text-xs text-forest hover:underline">Change password</button>
              )}
              <button type="submit" className="w-full bg-forest text-white py-2.5 rounded-full hover:bg-green-900">Login</button>
              {message && <p className="text-red-600 text-sm">{message}</p>}
            </form>
            <p className="text-xs text-gray-400 mt-4">Note: Demo login for frontend prototype. Production uses Supabase Auth with role check.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-serif text-3xl text-forest">Dashboard</h1>
                <a href="/" onClick={() => { setAuth(false); document.cookie = 'jrs-session=; path=/; max-age=0'; }} className="text-xs text-forest hover:underline">Home / Logout</a>
                <div className="mt-4 pt-3 border-t border-green-100">
                  <h3 className="font-medium text-forest mb-2">Change Password</h3>
                  <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 mb-2 text-sm" />
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 mb-2 text-sm" />
                  <button type="button" disabled={changeSending} onClick={handleChangePassword} className={`w-full py-2 rounded-full text-white text-sm transition ${changeSending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{changeSending ? 'Updating...' : 'Update Password'}</button>
                  {changeMsg && <p className={`text-xs mt-1 ${changeMsg.includes('updated') ? 'text-green-700' : 'text-red-600'}`}>{changeMsg}</p>}
                </div>
              </div>
              <button onClick={exportCSV} className="bg-gold text-forest px-4 py-2 rounded-full text-sm font-medium hover:bg-yellow-300">Export CSV</button>
            </div>
            <div className="mb-4 flex gap-2 items-center flex-wrap">
              {['all','pending','completed'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium ${filter === f ? 'bg-forest text-white' : 'bg-white text-gray-600 border'}`}>{f}</button>
              ))}
            </div>
            <div className="bg-white border border-green-100 rounded-xl p-4 mb-4 shadow-sm flex items-center gap-3 flex-wrap">
              <label htmlFor="biz-email" className="text-sm font-medium text-forest">Business Email</label>
              <input id="biz-email" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="border border-green-200 rounded-lg px-3 py-1 text-sm w-72" placeholder="contact@johnsonriseshine.gy" />
              <button onClick={async () => { await supabase.from('business_settings').upsert({ key: 'email', value: businessEmail }); alert('Business email updated everywhere'); }} className="text-xs bg-forest text-white px-3 py-1.5 rounded-full hover:bg-green-900">Save to Supabase</button>
            </div>
            <table className="w-full bg-white rounded-2xl shadow border border-green-100 text-sm">
              <thead className="bg-green-50"><tr><th className="text-left px-4 py-3">Ref</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Service</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.ref} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">{r.phone}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status || 'pending'}</span></td>
                    <td className="px-4 py-3">{r.service}</td>
                    <td className="px-4 py-3 space-x-2">
                      <a href={`https://wa.me/5926992175?text=Update%20on%20request%20${r.ref}`} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline text-xs">WhatsApp</a>
                      <button onClick={() => markCompleted(r.ref)} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded hover:bg-green-200">Complete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
