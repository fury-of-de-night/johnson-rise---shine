import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Head><title>Privacy Policy - Johnson Rise & Shine</title></Head>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-forest mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: 2026-09-14. We value your privacy and handle all data in compliance with applicable data protection principles.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Data We Collect</h2>
        <p className="text-gray-700 leading-relaxed mb-6">We collect only what is necessary to provide landscaping services: your name, Guyana phone number (+592 format), email, address (Region/Village), service preferences, preferred dates, property descriptions, and any special requirements. WhatsApp opt-in consent is stored separately.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Temporary IP Logging</h2>
        <p className="text-gray-700 leading-relaxed mb-6">To protect against spam, automated abuse, and malicious form submissions, we temporarily log your IP address during verification. This is used solely for rate limiting and security, is not sold or shared, and is automatically cleared after the rate-limit window expires.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Data Retention</h2>
        <p className="text-gray-700 leading-relaxed mb-6">Service request data is retained for up to 2 years from the date of submission. After that, it is securely deleted unless a longer retention period is required by local law or an active contract.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">WhatsApp Policy</h2>
        <p className="text-gray-700 leading-relaxed mb-6">If you opt in to WhatsApp updates, we only send messages related to your service request. We do not share your number with third parties. You may opt out at any time by messaging "STOP" or contacting us directly.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Your Rights</h2>
        <p className="text-gray-700 leading-relaxed mb-6">You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:hello@johnsonriseshine.gy" className="text-forest underline">hello@johnsonriseshine.gy</a> or via WhatsApp at +592 699 2175. We respond within 5 business days.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Security</h2>
        <p className="text-gray-700 leading-relaxed mb-6">Data is stored securely using Supabase infrastructure with RLS policies and authenticated access. Form autosave uses localStorage only (no remote transmission) until you explicitly submit.</p>

        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Contact</h2>
        <p className="text-gray-700">Johnson Rise & Shine - Guyana Landscaping. WhatsApp: <a href="https://wa.me/5926992175" className="text-forest underline" target="_blank" rel="noopener noreferrer">+592 699 2175</a>. Email: <a href="mailto:hello@johnsonriseshine.gy" className="text-forest underline">hello@johnsonriseshine.gy</a>.</p>
      </main>
      <Footer />
    </>
  );
}
