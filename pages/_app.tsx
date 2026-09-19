import '../styles/globals.css';
import Head from 'next/head';
import CookieBanner from '@/components/CookieBanner';
export default function MyApp({ Component, pageProps }: any) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <CookieBanner />
    </>
  );
}
