export function generateWhatsAppLink(
  message = "Hello Johnson Rise & Shine! 🌱 I'd like to request landscaping services. Please contact me at +592 699 2175."
): string {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/5926992175?text=${encoded}`;
  return url;
}

export function openWhatsAppInNewTab(): void {
  const url = generateWhatsAppLink();
  window.open(url, "_blank", "noopener,noreferrer");
}
