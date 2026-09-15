import Head from 'next/head';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found - Johnson Rise & Shine</title>
        <meta name="description" content="This page does not exist." />
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-6 text-center">
        <h1 className="font-serif text-6xl md:text-8xl text-forest mb-4">404</h1>
        <p className="text-xl md:text-2xl text-forest mb-2">Page not found</p>
        <p className="text-gray-600 mb-8 max-w-md">The page you are looking for doesn't exist or may have been moved.</p>
        <Link href="/" className="inline-block bg-forest text-white px-8 py-3 rounded-full font-medium hover:bg-green-900 transition shadow-lg">Back to Home</Link>
      </main>
    </>
  );
}
