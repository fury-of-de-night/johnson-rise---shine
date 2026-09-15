import '../styles/globals.css';
import CookieBanner from '@/components/CookieBanner';
export default function MyApp({ Component, pageProps }: any) {
  return (
    <>
      <Component {...pageProps} />
      <CookieBanner />
    </>
  );
}
