import { generateWhatsAppLink, openWhatsAppInNewTab } from "@/lib/whatsapp";

export default function WhatsAppFloatButton({ message }: { message?: string }) {
  return (
    <a
      href={generateWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openWhatsAppInNewTab}
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg px-5 py-3 flex items-center gap-2 transition-colors"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-4.3a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <span className="text-sm font-medium">WhatsApp</span>
    </a>
  );
}
