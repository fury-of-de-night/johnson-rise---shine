export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-forest via-green-900 to-forest text-white">
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="leaves" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M10 0 C5 10 15 15 10 20 C5 15 0 10 10 0 Z" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#leaves)" />
        </svg>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-28 md:py-36 relative z-10 text-center">
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mb-6">Johnson Rise & Shine</h1>
        <p className="text-light-green text-lg md:text-2xl max-w-2xl mx-auto mb-8">Landscaping, garden design, and property maintenance for Guyana, rooted in local ecology and built to last.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/request" className="bg-gold text-forest px-8 py-3 rounded-full font-medium hover:bg-yellow-300 transition shadow-lg">Request Service</a>
          <a href="https://wa.me/5926992175?text=Hello%20Johnson%20Rise%20%26%20Shine%20landscaping" target="_blank" rel="noopener noreferrer" className="bg-white text-forest px-8 py-3 rounded-full font-medium hover:bg-green-50 transition shadow-lg">Contact WhatsApp</a>
        </div>
      </div>
    </section>
  );
}
