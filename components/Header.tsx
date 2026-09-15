import Link from 'next/link';
import { useState } from 'react';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Request', href: '/request' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Admin', href: '/admin' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-green-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-forest font-bold tracking-tight">Johnson Rise & Shine</Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-forest transition">{l.label}</Link>
          ))}
        </nav>
        <button aria-label="Menu" onClick={() => setOpen(!open)} className="md:hidden text-forest">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
      {open && (
        <nav className="md:hidden bg-white border-t border-green-100 px-6 py-4 space-y-2 shadow-md">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-gray-700 hover:text-forest font-medium">{l.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
