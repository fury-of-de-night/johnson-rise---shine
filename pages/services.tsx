import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloatButton from '@/components/WhatsAppFloatButton';
import Head from 'next/head';

const serviceList = [
  { title: "Lawn Installation & Maintenance", desc: "Full turf sourcing, leveling, weekly mowing, edging, and fertilization schedules for year-round greenery.", icon: "🌿" },
  { title: "Tree & Shrub Pruning", desc: "Certified pruning to improve health, structure, and appearance of mature trees and ornamental shrubs.", icon: "🌳" },
  { title: "Garden Design & Planting", desc: "Custom bed layouts, native and ornamental selection, soil amendment, irrigation, and seasonal rotation.", icon: "🌸" },
  { title: "Hardscaping - Paths & Patios", desc: "Stone, concrete, and brick pathways, retaining walls, decorative borders, and patio installations.", icon: "🪨" },
  { title: "Irrigation Systems", desc: "Design and installation of drip and sprinkler networks, zone mapping, and dry-season reliability plans.", icon: "💧" },
  { title: "Land Clearing & Grading", desc: "Brush removal, topsoil preservation, grade leveling, erosion control, and site prep.", icon: "⛰️" },
  { title: "Fencing & Boundary Work", desc: "Natural hedge planting, treated wood, and wire fencing for privacy and property definition.", icon: "🪵" },
  { title: "Ornamental Lighting", desc: "Low-voltage solar and LED lighting for pathways, trees, and outdoor entertaining spaces.", icon: "💡" },
  { title: "Compost & Soil Health", desc: "Organic compost, mulch, soil testing, pH correction, and sustainable soil management.", icon: "🍂" },
  { title: "Seasonal Cleanup", desc: "Leaf removal, storm debris clearing, pre-rain preparation, and post-season restoration.", icon: "🍁" },
];

export default function ServicesPage() {
  return (
    <>
      <Head>
        <title>Services - Johnson Rise & Shine</title>
        <meta name="description" content="Landscaping services in Guyana: lawn care, pruning, irrigation, hardscaping, and more." />
      </Head>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4">Our Services</h1>
        <p className="text-gray-600 max-w-2xl mb-12">Every service is delivered with local expertise, from tropical plant selection to drainage-aware grading for Guyana’s climate.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {serviceList.map((s) => (
            <article key={s.title} className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 flex gap-5 hover:shadow-md transition">
              <div className="text-3xl" aria-hidden>{s.icon}</div>
              <div>
                <h3 className="font-serif text-xl text-forest mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="https://wa.me/5926992175?text=Hello%20Johnson%20Rise%20%26%20Shine!%20I%20would%20like%20a%20service%20quote." target="_blank" rel="noopener noreferrer" className="inline-block bg-gold text-forest px-8 py-3 rounded-full font-medium hover:bg-yellow-300 transition shadow-lg">Request Service</a>
        </div>
      </main>
      <Footer />
      <WhatsAppFloatButton />
    </>
  );
}
