import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

async function verifySignature(body: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  const valid = await verifySignature(body, signature);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const sub = event.payload?.subscription?.entity;
  if (!sub) return new Response("ok", { status: 200 });

  const pharmacyId = sub.notes?.pharmacy_id;
  if (!pharmacyId) return new Response("ok", { status: 200 });

  let status = "Active";
  if (event.event === "subscription.cancelled") status = "Cancelled";
  if (event.event === "subscription.halted" || event.event === "subscription.pending") status = "Past Due";
  if (event.event === "subscription.activated" || event.event === "subscription.charged") status = "Active";

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status,
      current_period_end: sub.current_end
        ? new Date(sub.current_end * 1000).toISOString().split("T")[0]
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("pharmacy_id", pharmacyId);

  return new Response("ok", { status: 200 });
});