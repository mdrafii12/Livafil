import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const PLAN_MAP: Record<string, string> = {
  Starter: Deno.env.get("RAZORPAY_PLAN_STARTER")!,
  Professional: Deno.env.get("RAZORPAY_PLAN_PROFESSIONAL")!,
  Enterprise: Deno.env.get("RAZORPAY_PLAN_ENTERPRISE")!,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pharmacyId, plan } = await req.json();
    const razorpayPlanId = PLAN_MAP[plan];
    if (!razorpayPlanId) {
      return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        customer_notify: 1,
        total_count: 12,
        notes: { pharmacy_id: pharmacyId, plan },
      }),
    });

    const razorpaySub = await razorpayRes.json();
    if (!razorpayRes.ok) {
      return new Response(JSON.stringify({ error: razorpaySub }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("subscriptions").upsert(
      {
        pharmacy_id: pharmacyId,
        plan,
        status: "Trialing",
        razorpay_subscription_id: razorpaySub.id,
      },
      { onConflict: "pharmacy_id" }
    );

    return new Response(
      JSON.stringify({ subscriptionId: razorpaySub.id, keyId: RAZORPAY_KEY_ID }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
