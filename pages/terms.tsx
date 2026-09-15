import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <>
      <Head><title>Terms of Service - Johnson Rise & Shine</title></Head>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-forest mb-6">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Effective 2026-09-14. By using this site and submitting a service request, you agree to the following terms.</p>
        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Service Requests</h2>
        <p className="text-gray-700 leading-relaxed mb-6">All requests are subject to confirmation. We reserve the right to decline work outside our service area or that poses safety risks. Pricing and timelines are estimated and confirmed upon visit or follow-up.</p>
        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Responsibility</h2>
        <p className="text-gray-700 leading-relaxed mb-6">Customers are responsible for providing accurate property information and access. We are not liable for damage caused by hidden utilities, unmarked pipes, or pre-existing property conditions.</p>
        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Payment & Cancellation</h2>
        <p className="text-gray-700 leading-relaxed mb-6">Payment terms are agreed in writing. Cancellations made with less than 48 hours notice may incur a fee. We do not refund completed work except where required by law.</p>
        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Intellectual Property</h2>
        <p className="text-gray-700 leading-relaxed mb-6">All content on this site is owned by Johnson Rise & Shine unless otherwise noted. You may not reproduce materials without written permission.</p>
        <h2 className="font-serif text-xl text-forest mt-6 mb-3">Governing Law</h2>
        <p className="text-gray-700 leading-relaxed">These terms are governed by the laws of Guyana. Disputes are resolved through direct negotiation, then mediation, and if necessary, local courts.</p>
      </main>
      <Footer />
    </>
  );
}
