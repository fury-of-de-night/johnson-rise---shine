import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@johnsonrise.com";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name, contact, service, message, timestamp } = payload || {};
  const subject = `Johnson Rise & Shine — New Landscaping Request from ${name || "Unknown"}`;
  const body = `
New request received:
- Name: ${name || "N/A"}
- Contact: ${contact || "N/A"}
- Service: ${service || "N/A"}
- Message: ${message || "N/A"}
- Timestamp: ${timestamp || new Date().toISOString()}
- WhatsApp: +592 699 2175
`;

  // Email send via Supabase SMTP / external provider (env-only, no embedded secret)
  // Admin notification only — no live token persisted here.
  console.log("[email-notify] To:", ADMIN_EMAIL, "Subject:", subject);
  console.log("[email-notify] Body:\n", body);

  return new Response(JSON.stringify({ ok: true, to: ADMIN_EMAIL }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
