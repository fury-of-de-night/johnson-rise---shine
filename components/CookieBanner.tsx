import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('jrs-cookie-consent')) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem('jrs-cookie-consent', 'true'); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t border-green-200 shadow-xl px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-gray-700">We use cookies to improve your experience</p>
        <button onClick={dismiss} className="bg-forest text-white px-5 py-1.5 rounded-full text-sm font-medium hover:bg-green-900 transition">OK</button>
      </div>
    </div>
  );
}
