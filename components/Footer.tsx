import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="font-serif text-xl mb-3">Johnson Rise & Shine</h3>
          <p className="text-light-green mb-3">Landscaping and property maintenance in Guyana.</p>
          <p className="text-light-green">WhatsApp: <a href="https://wa.me/5926992175" className="underline hover:text-gold" target="_blank" rel="noopener noreferrer">+592 699 2175</a></p>
          <p>Email: <a href="mailto:hello@johnsonriseshine.gy" className="underline hover:text-gold">hello@johnsonriseshine.gy</a></p>
        </div>
        <div>
          <h4 className="font-medium mb-3">Hours</h4>
          <p className="text-light-green">Mon – Sat: 7:00 AM – 6:00 PM</p>
          <p className="text-light-green">Time Zone: AST (GMT-4)</p>
        </div>
        <div>
          <h4 className="font-medium mb-3">Quick Links</h4>
          <ul className="space-y-2 text-light-green">
            <li><Link href="/" className="hover:text-gold">Home</Link></li>
            <li><Link href="/services" className="hover:text-gold">Services</Link></li>
            <li><Link href="/request" className="hover:text-gold">Request Service</Link></li>
            <li><Link href="/privacy" className="hover:text-gold">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-gold">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-green-800 text-center text-xs text-light-green/70 py-4">
        © {new Date().getFullYear()} Johnson Rise & Shine. Guyana landscaping services.
      </div>
    </footer>
  );
}
