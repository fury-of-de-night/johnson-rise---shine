import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { token } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: pending } = await supabase.from('pending_service_requests').select('*').eq('verification_token', token).single();
  if (!pending) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400 });
  // Move to service_requests
  await supabase.from('service_requests').insert({ customer_name: pending.customer_name, phone: pending.phone, email: pending.email, address: pending.address, service_type: pending.service_type, description: pending.description, status: 'pending' });
  await supabase.from('pending_service_requests').delete().eq('id', pending.id);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
});
