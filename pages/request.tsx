import { useState, useEffect, FormEvent } from 'react';

// reCAPTCHA types
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (element: string | HTMLElement, options: any) => number;
    };
  }
}
import Head from 'next/head';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloatButton from '@/components/WhatsAppFloatButton';
import { supabase } from '@/lib/supabase';
import { isDisposableEmail } from '@/lib/disposable-blocklist';

const servicesList = [
  "Lawn Installation & Maintenance",
  "Tree & Shrub Pruning",
  "Garden Design & Planting",
  "Hardscaping - Paths & Patios",
  "Irrigation Systems",
  "Land Clearing & Grading",
  "Fencing & Boundary Work",
  "Ornamental Lighting",
  "Compost & Soil Health",
  "Seasonal Cleanup",
];

export default function RequestPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    region: '',
    village: '',
    services: [] as string[],
    preferredDate: '',
    propertyDescription: '',
    specialRequirements: '',
    whatsappOptIn: false,
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [errorState, setErrorState] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jrs-request-form');
      if (raw) {
        const saved = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...saved }));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('jrs-request-form', JSON.stringify({ ...form, timestamp: new Date().toISOString() }));
    } catch { /* ignore */ }
  }, [form]);

  const sanitize = (str: string) => str.replace(/[<>"'&]/g, (c) => ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '&':'&amp;' }[c as string] || c));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    const phoneRegex = /^\+592\s?6\d{2}\s?\d{4}$/;
    if (!form.phone || !phoneRegex.test(form.phone.trim())) e.phone = 'Enter a valid Guyana number: +592 699 2175.';
    if (!form.email || !form.email.includes('@') || !form.email.includes('.')) e.email = 'Enter a valid email.';
    if (!form.region.trim()) e.region = 'Region is required.';
    if (!form.village.trim()) e.village = 'Village / Town is required.';
    if (form.services.length === 0) e.services = 'Select at least one service.';
    if (!form.preferredDate) e.preferredDate = 'Preferred date is required.';
    else if (new Date(form.preferredDate) < new Date(new Date().setHours(0, 0, 0, 0))) e.preferredDate = 'Date must be in the future.';
    if (!form.consent) e.consent = 'You must consent to submit this request.';

    if (!form.consent) {
      e.consent = 'You must consent to submit this request.';
    } else {
      delete e.consent;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        const firstKey = Object.keys(e)[0];
        const el = document.getElementById(firstKey);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      }, 50);
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent, viaWhatsApp = false) => {
    e.preventDefault();
    setSubmitting(true);
    if (!validate()) { setSubmitting(false); return; }
    const ref = 'JRS-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const recaptchaToken = await new Promise<string>((resolve, reject) => {
      if (!window.grecaptcha) {
        reject(new Error('reCAPTCHA not loaded'));
        return;
      }

      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, {
            action: 'submit',
          })
          .then(resolve)
          .catch(reject);
      });
    }).catch(() => null);

    if (!recaptchaToken) {
      setSubmitting(false);
      setErrors((prev) => ({ ...prev, recaptcha: 'Please complete the reCAPTCHA verification.' }));
      return;
    }

    const verifyRes = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: recaptchaToken }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      setSubmitting(false);
      setErrors((prev) => ({ ...prev, recaptcha: 'reCAPTCHA verification failed. Please try again.' }));
      return;
    }
    if (isDisposableEmail(form.email.trim())) {
      setSubmitting(false);
      setErrors((prev) => ({ ...prev, email: 'Disposable email not allowed.' }));
      return;
    }
    const { error } = await supabase.from('pending_service_requests').insert({
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.region.trim() + ', ' + form.village.trim(),
      service_type: form.services.join(', '),
      description: `Property: ${form.propertyDescription.trim()}\nSpecial Requirements: ${form.specialRequirements.trim()}\nPreferred Date: ${form.preferredDate}\nWhatsApp Opt-in: ${form.whatsappOptIn}`,
      verification_token: ref, // Store ref as verification token
    });
    if (error) {
      console.error('Supabase insert error:', error);
      setErrorState('its not you its us, send a message on whatsapp instead');
      setRefNumber(ref); // Still set ref for WhatsApp message
      setSubmitted(true); // Show submitted state with error message
      try { localStorage.removeItem('jrs-request-form'); } catch { /* ignore */ }

      if (viaWhatsApp) {
        const msg = `Error submitting request (${ref}). %0Aits not you its us, send a message on whatsapp instead`;
        window.open(`https://wa.me/5926992175?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
      }
      setSubmitting(false);
      return;
    }

    setRefNumber(ref);
    setSubmitted(true);
    setErrorState(''); // Clear any error state
    try { localStorage.removeItem('jrs-request-form'); } catch { /* ignore */ }

    if (viaWhatsApp) {
      const msg = `Service Request (${ref})%0AName: ${encodeURIComponent(sanitize(form.name.trim()))}%0APhone: ${encodeURIComponent(form.phone.trim())}%0AEmail: ${encodeURIComponent(form.email.trim())}%0AAddress: ${encodeURIComponent(form.region.trim() + ", " + form.village.trim())}%0AServices: ${encodeURIComponent(form.services.join(", "))}%0APreferred Date: ${encodeURIComponent(form.preferredDate)}%0ADescription: ${encodeURIComponent(sanitize(form.propertyDescription.trim()))}`;
      window.open(`https://wa.me/5926992175?text=${msg}`, '_blank', 'noopener,noreferrer');
    }
    setSubmitting(false);
  };

  const toggleService = (s: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s) ? prev.services.filter((x) => x !== s) : [...prev.services, s],
    }));
  };

  return (
    <>
      <Head>
        <title>Request Service - Johnson Rise & Shine</title>
        <meta name="description" content="Request landscaping services in Guyana." />
      </Head>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        strategy="afterInteractive"
      />
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-forest mb-3">Service Request</h1>
        <p className="text-gray-600 mb-10">All fields required unless noted. Data is stored securely; we respond within 1 business day.</p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl text-forest mb-2">Request Submitted</h2>
            <p className="text-gray-700 mb-1">Reference number: <strong className="text-forest">{refNumber}</strong></p>
            <p className="text-sm text-gray-500 mb-6">Saved to local storage. You can reference this number when messaging us on WhatsApp.</p>
            <a href={`https://wa.me/5926992175?text=Following%20up%20on%20request%20${refNumber}`} target="_blank" rel="noopener noreferrer" className="inline-block bg-forest text-white px-6 py-3 rounded-full font-medium hover:bg-green-900 transition">Continue on WhatsApp</a>
          </div>
        ) : (
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-6" noValidate>
            {/* Honeypot */}
            <input type="text" name="honeypot" autoComplete="off" className="hidden" tabIndex={-1} aria-hidden="true" />

            <div>
              <label htmlFor="name" className="block font-medium text-forest mb-1">Full Name</label>
              <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="Your full name" />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block font-medium text-forest mb-1">Phone (Guyana +592)</label>
              <input id="phone" type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="+592 699 2175" />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block font-medium text-forest mb-1">Email</label>
              <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="you@example.com" />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="region" className="block font-medium text-forest mb-1">Region</label>
                <input id="region" type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="e.g., Region 4" />
                {errors.region && <p className="text-red-600 text-sm mt-1">{errors.region}</p>}
              </div>
              <div>
                <label htmlFor="village" className="block font-medium text-forest mb-1">Village / Town</label>
                <input id="village" type="text" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="e.g., Georgetown" />
                {errors.village && <p className="text-red-600 text-sm mt-1">{errors.village}</p>}
              </div>
            </div>

            <div>
              <p className="font-medium text-forest mb-2">Services</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {servicesList.map((s) => (
                  <label key={s} className="flex items-center gap-2 bg-white border border-green-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-green-50 transition text-sm">
                    <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleService(s)} className="accent-forest" />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
              {errors.services && <p className="text-red-600 text-sm mt-1">{errors.services}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block font-medium text-forest mb-1">Preferred Date</label>
                <input id="date" type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" />
                {errors.preferredDate && <p className="text-red-600 text-sm mt-1">{errors.preferredDate}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="propertyDescription" className="block font-medium text-forest mb-1">Property Description</label>
              <textarea id="propertyDescription" rows={4} value={form.propertyDescription} onChange={(e) => setForm({ ...form, propertyDescription: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="Property size, access, current issues, plants to preserve, etc." />
            </div>

            <div>
              <label htmlFor="specialRequirements" className="block font-medium text-forest mb-1">Special Requirements</label>
              <textarea id="specialRequirements" rows={3} value={form.specialRequirements} onChange={(e) => setForm({ ...form, specialRequirements: e.target.value })} className="w-full rounded-xl border border-green-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/40 bg-white" placeholder="Accessibility, pets, scheduling constraints, etc." />
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} className="accent-forest" />
              <span>I agree to receive WhatsApp updates for this request</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="accent-forest" />
              <span>I consent to Johnson Rise & Shine storing my data to process this request.</span>
            </label>
            
            {errors.consent && <p className="text-red-600 text-xs">{errors.consent}</p>}
            <p className="text-xs text-gray-500 pt-1">This site is protected by reCAPTCHA. Google's{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-forest">Privacy Policy</a> and{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-forest">Terms of Service</a> apply.</p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button type="submit" className="bg-forest text-white px-8 py-3 rounded-full font-medium hover:bg-green-900 transition shadow-lg">Submit Request</button>
              <button type="button" onClick={(e) => handleSubmit(e as any, true)} className="bg-gold text-forest px-8 py-3 rounded-full font-medium hover:bg-yellow-300 transition shadow-lg">Submit & Continue on WhatsApp</button>
            </div>
          </form>
        )}
      </main>
      <Footer />
      <WhatsAppFloatButton />
    </>
  );
}
