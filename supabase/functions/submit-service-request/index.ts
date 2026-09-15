import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISPOSABLE = ["mailinator.com","temp-mail.org","guerrillamail.com","maildrop.cc","yopmail.com","throwawaymail.com","fakeinbox.com","tempinbox.com","spam4.me","emailondeck.com","getnada.com"];

serve(async (req) => {
  const { customer_name, phone, email, address, service_type, description } = await req.json();
  // Validation
  if (!email || !email.includes('@') || DISPOSABLE.some(d => email.endsWith('@' + d))) {
    return new Response(JSON.stringify({ error: "Invalid or disposable email" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.from('pending_service_requests').insert({ customer_name, phone, email, address, service_type, description, verification_token: crypto.randomUUID() }).select();
  return new Response(JSON.stringify({ success: true, id: data?.[0]?.id, token: data?.[0]?.verification_token }), { status: 200, headers: { "Content-Type": "application/json" }, headers: { "Access-Control-Allow-Origin": "*" } });
});
