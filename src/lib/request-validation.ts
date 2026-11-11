import { z } from 'zod';

export const servicesList = [
  'Lawn Installation & Maintenance', 'Tree & Shrub Pruning', 'Garden Design & Planting',
  'Hardscaping - Paths & Patios', 'Irrigation Systems', 'Land Clearing & Grading',
  'Fencing & Boundary Work', 'Ornamental Lighting', 'Compost & Soil Health', 'Seasonal Cleanup',
];

export const requestSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+592\s?6\d{2}\s?\d{4}$/),
  email: z.string().trim().email().max(254),
  address: z.string().trim().min(3).max(500),
  service_type: z.string().max(1000).refine(value => {
    const selected = value.split(', ');
    return selected.length > 0 && selected.every(service => servicesList.includes(service));
  }),
  description: z.string().trim().max(5000),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T00:00:00Z');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guyana', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= today;
  }),
  consent: z.literal(true),
  whatsapp_confirmed: z.boolean(),
  honeypot: z.string().max(0).optional(),
});
