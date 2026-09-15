import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import HeroSection from '@/components/HeroSection';
import WhatsAppFloatButton from '@/components/WhatsAppFloatButton';

const services = [
  { title: "Lawn Installation & Maintenance", desc: "Premium turf sourcing, leveling, mowing schedules, edging, and seasonal fertilization for lasting greenery.", icon: "🌿" },
  { title: "Tree & Shrub Pruning", desc: "Certified arborist pruning for health, safety, and aesthetics, done to Guyana’s tropical growth cycles.", icon: "🌳" },
  { title: "Garden Design & Planting", desc: "Native and ornamental bed layouts, soil amendment, drip irrigation, and seasonal rotation planning.", icon: "🌸" },
  { title: "Hardscaping - Paths & Patios", desc: "Stone, brick, and concrete pathways; patios, retaining walls, and decorative borders built to last.", icon: "🪨" },
  { title: "Irrigation Systems", desc: "Custom drip and sprinkler design, pump sourcing, zone mapping, and maintenance for dry-season reliability.", icon: "💧" },
  { title: "Land Clearing & Grading", desc: "Safe brush clearing, topsoil preservation, grade leveling, and erosion control for new builds or expansions.", icon: "⛰️" },
  { title: "Fencing & Boundary Work", desc: "Natural hedge planting, treated wood, and wire fencing for property definition and privacy.", icon: "🪵" },
  { title: "Ornamental Lighting", desc: "Low-voltage solar and LED landscape lighting for pathways, feature trees, and outdoor entertaining.", icon: "💡" },
  { title: "Compost & Soil Health", desc: "On-site composting, organic mulch, pH correction, and soil testing to sustain healthy plant life.", icon: "🍂" },
  { title: "Seasonal Cleanup", desc: "Leaf removal, storm debris clearing, pre-rain preparation, and post-season restoration of beds and lawns.", icon: "🍁" },
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Johnson Rise & Shine - Landscaping Guyana</title>
        <meta name="description" content="Premium landscaping, garden design, and property maintenance in Guyana. WhatsApp +592 699 2175." />
      </Head>
      <Header />
      <main>
        <HeroSection />

        <section aria-label="Services" className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-forest mb-3">Our Services</h2>
            <p className="text-gray-600 max-w-xl mx-auto">From new lawn installation to full garden design, we handle every detail with local expertise.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <ServiceCard key={s.title} title={s.title} desc={s.desc} icon={s.icon} />
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <Link href="/request" className="inline-block bg-forest text-white px-8 py-3 rounded-full font-medium hover:bg-green-900 transition shadow-lg">Request Service</Link>
            <a href="https://wa.me/5926992175?text=Hello%20Johnson%20Rise%20%26%20Shine!%20I%20would%20like%20to%20request%20landscaping%20services." target="_blank" rel="noopener noreferrer" className="inline-block bg-gold text-forest px-8 py-3 rounded-full font-medium hover:bg-yellow-300 transition shadow-lg">Contact WhatsApp</a>
          </div>
        </section>

        <section aria-label="About" className="bg-forest text-white py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="font-serif text-3xl md:text-4xl mb-6">About Johnson Rise & Shine</h2>
            <p className="text-light-green leading-relaxed mb-4">Landscaping, garden design, and property maintenance for Guyana, rooted in local ecology and built to last. We bring lasting beauty to homes, commercial properties, and public spaces, using quality materials and building relationships through reliable service.</p>
            <p className="text-light-green leading-relaxed">Based in Guyana. Phone +592 699 2175. Service is country wide across all regions.</p>
          </div>
        </section>

        <section aria-label="Contact" id="contact" className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-serif text-2xl text-forest mb-4">Contact</h2>
              <p className="mb-2"><strong>WhatsApp:</strong> <a href="https://wa.me/5926992175" className="underline text-forest" target="_blank" rel="noopener noreferrer">+592 699 2175</a></p>
              <p className="mb-2"><strong>Email:</strong> <a href="mailto:hello@johnsonriseshine.gy" className="underline text-forest">hello@johnsonriseshine.gy</a></p>
              <p><strong>Hours:</strong> Mon–Sat, 7:00 AM – 6:00 PM (AST, GMT-4)</p>
            </div>
            <div className="bg-white rounded-2xl shadow-md p-6 border border-green-100">
              <h3 className="font-serif text-xl text-forest mb-3">Quick Request</h3>
              <p className="text-sm text-gray-600 mb-4">Describe your property and preferred service; we'll reply within one business day.</p>
              <Link href="/request" className="inline-block w-full text-center bg-forest text-white px-6 py-3 rounded-full font-medium hover:bg-green-900 transition">Start Request Form</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloatButton />
    </>
  );
}
