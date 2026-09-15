import { useState, useEffect, FormEvent } from 'react';
import { sanitizeXss } from '../src/lib/security';

const services = [
  "Lawn Installation & Maintenance",
  "Tree & Shrub Pruning",
  "Garden Design & Planting",
  "Hardscaping — Paths & Patios",
  "Irrigation Systems",
  "Land Clearing & Grading",
  "Fencing & Boundary Work",
  "Ornamental Lighting",
  "Compost & Soil Health",
  "Seasonal Cleanup",
];

export default function RequestForm({ onSuccess }: { onSuccess?: (ref: string) => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', region: '', village: '',
    services: [] as string[], preferredDate: '', propertyDescription: '', specialRequirements: '', whatsappOptIn: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!/^\+592\s?6\d{2}\s?\d{4}$/.test(form.phone.trim())) e.phone = 'Valid Guyana number required.';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required.';
    if (!form.region.trim()) e.region = 'Region required.';
    if (!form.village.trim()) e.village = 'Village required.';
    if (form.services.length === 0) e.services = 'Select at least one service.';
    if (!form.preferredDate || new Date(form.preferredDate) < new Date(new Date().setHours(0, 0, 0, 0))) e.preferredDate = 'Future date required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: FormEvent, viaWA = false) => {
    e.preventDefault();
    if (!validate()) return;
    const ref = 'JRS-' + Date.now();
    if (onSuccess) onSuccess(ref);
    const msg = `Request ${ref}: ${sanitizeXss(form.name)} | ${form.phone} | ${form.services.join(', ')}`;
    if (viaWA) window.open(`https://wa.me/5926992175?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const toggle = (s: string) => setForm((p) => ({ ...p, services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s] }));

  return (
    <form onSubmit={(e) => submit(e)} className="space-y-5" noValidate>
      <input type="text" name="honeypot" autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <label className="block text-sm font-medium text-forest mb-1">Full Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: sanitizeXss(e.target.value) })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-forest mb-1">Guyana Phone (+592)</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
        {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-forest mb-1">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
        {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forest mb-1">Region</label>
          <input value={form.region} onChange={(e) => setForm({ ...form, region: sanitizeXss(e.target.value) })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-forest mb-1">Village / Town</label>
          <input value={form.village} onChange={(e) => setForm({ ...form, village: sanitizeXss(e.target.value) })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-forest mb-2">Services</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {services.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm bg-green-50 border rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggle(s)} className="accent-forest" />
              <span>{s}</span>
            </label>
          ))}
        </div>
        {errors.services && <p className="text-red-600 text-xs mt-1">{errors.services}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-forest mb-1">Preferred Date</label>
        <input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
        {errors.preferredDate && <p className="text-red-600 text-xs mt-1">{errors.preferredDate}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-forest mb-1">Property Description</label>
        <textarea rows={3} value={form.propertyDescription} onChange={(e) => setForm({ ...form, propertyDescription: sanitizeXss(e.target.value) })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-forest mb-1">Special Requirements</label>
        <textarea rows={2} value={form.specialRequirements} onChange={(e) => setForm({ ...form, specialRequirements: sanitizeXss(e.target.value) })} className="w-full rounded-lg border border-green-200 px-4 py-2" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} className="accent-forest" />
        WhatsApp updates ok
      </label>
      <div className="flex gap-3">
        <button type="submit" className="bg-forest text-white px-6 py-2.5 rounded-full hover:bg-green-900">Submit Request</button>
        <button type="button" onClick={(e) => submit(e as any, true)} className="bg-gold text-forest px-6 py-2.5 rounded-full hover:bg-yellow-300">Submit & WhatsApp</button>
      </div>
    </form>
  );
}
