export interface LandscapingRequest {
  name: string;
  contact: string;
  service: string;
  message: string;
  timestamp?: string;
}

const STORAGE_KEY = "jrs-request-form";

export function saveFormData(data: Partial<LandscapingRequest>): void {
  try {
    const existing = loadFormData();
    const updated = { ...existing, ...data, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore storage errors */ }
}

export function loadFormData(): Partial<LandscapingRequest> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearFormData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
