import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSending, setChangeSending] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');

  // Password reset (forgot)
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Data
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingPromoting, setPendingPromoting] = useState<string | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionSuccess, setPromotionSuccess] = useState<string | null>(null);
  const [businessEmail, setBusinessEmail] = useState('admin@johnsonriseshine.gy');
  const [filter, setFilter] = useState('all');

  // Scroll important errors into view smoothly
  const scrollToError = useCallback((id?: string) => {
    setTimeout(() => {
      const target = id ? document.getElementById(id) : document.getElementById('admin-error-area');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  // Check existing Supabase Auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          setAuth(true);
        }
      } catch {
        // No session
      }
      setAuthLoading(false);
    };
    checkSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when authenticated
  const loadData = useCallback(async () => {
    if (!auth) return;

    // Load confirmed service requests
    const { data: srData, error: srErr } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!srErr && srData) {
      setRequests(srData.map((r: any) => ({
        id: r.id,
        ref: r.customer_ref || 'JRS-?',
        name: r.customer_name || '-',
        phone: r.phone || '-',
        status: r.status || 'pending',
        service: r.service_type || '-',
      })));
    }

    // Load pending requests (no token hash exposed — select only safe columns)
    const { data: prData, error: prErr } = await supabase
      .from('pending_service_requests')
      .select('id, customer_ref, customer_name, phone, email, address, service_type, description, whatsapp_confirmed, created_at')
      .order('created_at', { ascending: false });

    if (!prErr && prData) {
      setPendingRequests(prData.map((r: any) => ({
        id: r.id,
        ref: r.customer_ref ? ('PENDING-' + r.customer_ref) : ('PENDING-' + (r.id ? String(r.id).slice(0, 6).toUpperCase() : '')),
        customerRef: r.customer_ref || null,
        name: r.customer_name || '-',
        phone: r.phone || '-',
        email: r.email || '-',
        status: 'pending',
        service: r.service_type || '-',
        whatsappConfirmed: r.whatsapp_confirmed,
        createdAt: r.created_at,
        description: r.description || '',
      })));
    }
  }, [auth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh pending requests every 60s; skip if promotion in progress; clean up on unmount
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pendingPromoting) {
        loadData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData, pendingPromoting]);

  // Real Supabase Auth login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!email.trim() || !password) {
      setLoginError('Email and password are required.');
      scrollToError();
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoginError(error.message || 'Login failed.');
        scrollToError();
        return;
      }

      // Auth state change listener will set auth=true
    } catch {
      setLoginError('Login failed. Please try again.');
      scrollToError();
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuth(false);
    setRequests([]);
    setPendingRequests([]);
  };

  // Forgot password
  const handleForgot = async () => {
    if (!resetEmail.trim()) { setResetMsg('Enter your email address.'); return; }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/admin/reset`
          : 'https://johnson-rise-shine.vercel.app/admin/reset',
      });
      if (error) { setResetMsg(error.message || 'Failed to send reset link.'); }
      else { setResetMsg('If an account exists, a reset link has been sent.'); }
    } catch { setResetMsg('Failed to send reset link.'); }
    setResetSending(false);
  };

  // Change password (requires active session)
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setChangeMsg('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeMsg('Passwords do not match.');
      return;
    }
    setChangeSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setChangeMsg(error.message || 'Failed to update password.');
      } else {
        setChangeMsg('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setChangeMsg(''), 4000);
      }
    } catch {
      setChangeMsg('Failed to update password.');
    }
    setChangeSending(false);
  };

  // Promote a pending request
  const promotePending = async (pendingId: string) => {
    if (pendingPromoting === pendingId) return;
    setPendingPromoting(pendingId);
    setPromotionError(null);
    setPromotionSuccess(null);

    try {
      // Get the current authenticated user's access token from the Supabase client
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/promote-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ pendingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromotionError(data.error || 'Promotion failed');
        scrollToError('admin-error-area');
        setPendingPromoting(null);
        return;
      }

      // Success: remove from pending list and reload data
      setPendingRequests((prev) => prev.filter((p) => p.id !== pendingId));
      // data.customerRef is the JRS-XXXXXXXXXX reference from the promoted pending row.
      // Legacy requests (pre-008) have no customer_ref; show a neutral confirmation instead
      // of the literal string 'OK', which could be mistaken for a valid reference value.
      const displayRef = data.customerRef ? `Ref: ${data.customerRef}` : 'request confirmed (no reference on file)';
      setPromotionSuccess(`Request confirmed — ${displayRef}`);
      setTimeout(() => setPromotionSuccess(null), 4000);

      // Refresh service requests
      loadData();
    } catch (e) {
      console.error('Promotion error:', e);
      setPromotionError('Network error — please try again.');
      scrollToError('admin-error-area');
    }
    setPendingPromoting(null);
  };

  // Mark a service request as completed (local state + DB update)
  const markCompleted = async (id: string) => {
    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'completed' })
      .eq('id', id);

    if (!error) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'completed' } : r));
    }
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
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Guyana',
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => (r.status || 'pending') === filter);

  // Loading state while checking session
  if (authLoading) {
    return (
      <>
        <Head><title>Admin - Johnson Rise & Shine</title></Head>
        <main className="min-h-screen bg-green-50 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </main>
      </>
    );
  }

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
                  <input type="email" placeholder="Your email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <button type="button" disabled={resetSending} onClick={handleForgot} className={`w-full py-2.5 rounded-full text-white transition ${resetSending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{resetSending ? 'Sending...' : 'Send Reset Link'}</button>
                  <button type="button" onClick={() => { setResetMode(false); setResetMsg(''); }} className="w-full text-xs text-forest hover:underline">Back to login</button>
                  {resetMsg && <p className={`text-sm ${resetMsg.includes('sent') ? 'text-green-700' : 'text-red-600'}`}>{resetMsg}</p>}
                </>
              ) : (
                <>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
                  <button type="submit" className="w-full bg-forest text-white py-2.5 rounded-full hover:bg-green-900">Login</button>
                  <button type="button" onClick={() => setResetMode(true)} className="w-full text-xs text-forest hover:underline">Forgot password?</button>
                  {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
                </>
              )}
            </form>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-serif text-3xl text-forest">Dashboard</h1>
                <button onClick={handleLogout} className="text-xs text-forest hover:underline">Logout</button>
                <div className="mt-4 pt-3 border-t border-green-100">
                  <h3 className="font-medium text-forest mb-2">Change Password</h3>
                  <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 mb-2 text-sm" />
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 mb-2 text-sm" />
                  <button type="button" disabled={changeSending} onClick={handleChangePassword} className={`w-full py-2 rounded-full text-white text-sm transition ${changeSending ? 'bg-forest/60 cursor-not-allowed' : 'bg-forest hover:bg-green-900'}`}>{changeSending ? 'Updating...' : 'Update Password'}</button>
                  {changeMsg && <p className={`text-xs mt-1 ${changeMsg.includes('successfully') ? 'text-green-700' : 'text-red-600'}`}>{changeMsg}</p>}
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

            {/* Status messages */}
            {promotionSuccess && (
              <div className="bg-green-100 border border-green-300 text-green-800 text-sm px-4 py-2 rounded-lg mb-4">{promotionSuccess}</div>
            )}
            {promotionError && (
              <div className="bg-red-100 border border-red-300 text-red-800 text-sm px-4 py-2 rounded-lg mb-4">{promotionError}
                <button onClick={() => setPromotionError(null)} className="ml-2 text-xs underline">Dismiss</button>
              </div>
            )}

            <h2 className="text-xl font-medium text-forest mb-2">Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-gray-500 mb-6">No pending requests.</p>
            ) : (
              <table className="w-full bg-white rounded-2xl shadow border border-green-100 text-sm mb-6">
                <thead className="bg-green-50"><tr><th className="text-left px-4 py-3">Ref</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Service</th><th className="text-left px-4 py-3">Description</th><th className="text-left px-4 py-3">WhatsApp Opt-in</th><th className="text-left px-4 py-3">Requested</th><th className="text-left px-4 py-3">Action</th></tr></thead>
                <tbody>
                  {pendingRequests.map((r: any) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">{r.customerRef || r.ref}</td>
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="px-4 py-3">{r.phone}</td>
                      <td className="px-4 py-3 text-xs">{r.email || '-'}</td>
                      <td className="px-4 py-3">{r.service}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{r.description ? (String(r.description).slice(0, 60) || '-') : '-'}</td>
                      <td className="px-4 py-3"><span className={r.whatsappConfirmed ? 'text-green-700' : 'text-gray-400'}>{r.whatsappConfirmed ? 'Yes' : 'No'}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.createdAt ? formatDateGYT(r.createdAt) : '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          disabled={pendingPromoting === r.id}
                          onClick={() => promotePending(String(r.id))}
                          className={`text-xs px-2 py-0.5 rounded transition ${pendingPromoting === r.id ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-forest text-white hover:bg-green-900'}`}
                        >{pendingPromoting === r.id ? 'Promoting...' : 'Confirm'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mb-2">
              <h2 className="text-xl font-medium text-forest mb-2">Service Requests</h2>
            </div>
            <table className="w-full bg-white rounded-2xl shadow border border-green-100 text-sm">
              <thead className="bg-green-50"><tr><th className="text-left px-4 py-3">Ref</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Service</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">{r.phone}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status || 'pending'}</span></td>
                    <td className="px-4 py-3">{r.service}</td>
                    <td className="px-4 py-3 space-x-2">
                      <a href={`https://wa.me/5926992175?text=Update%20on%20request%20${r.ref}`} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline text-xs">WhatsApp</a>
                      {r.status !== 'completed' && (
                        <button onClick={() => markCompleted(r.id)} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded hover:bg-green-200">Complete</button>
                      )}
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
