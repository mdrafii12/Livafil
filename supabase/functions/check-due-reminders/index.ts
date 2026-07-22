import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pharmacyId } = await req.json();
    if (!pharmacyId) {
      return new Response(JSON.stringify({ error: "Missing pharmacyId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split('T')[0];

    // Find all pending reminders due on or before today for this pharmacy
    const { data: dueReminders, error: fetchError } = await supabaseAdmin
      .from('reminder_schedule')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'Pending')
      .lte('due_date', today);

    if (fetchError) throw fetchError;

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders due", dueReminders: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send WhatsApp messages and update statuses
    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

    let successCount = 0;
    let failCount = 0;

    for (const r of dueReminders) {
      if (WHATSAPP_API_TOKEN && WHATSAPP_PHONE_ID) {
        try {
          // Format phone number to E.164 without '+'
          let formattedPhone = r.customer_phone.replace(/\D/g, '');
          if (formattedPhone.length === 10) formattedPhone = `91${formattedPhone}`;

          const res = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: formattedPhone,
              type: "template",
              template: {
                name: "refill_reminder",
                language: { code: "en" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: r.customer_name },
                      { type: "text", text: r.medicine_name },
                      { type: "text", text: "your pharmacy" }
                    ]
                  }
                ]
              }
            })
          });

          if (res.ok) {
            await supabaseAdmin.from('reminder_schedule').update({ status: 'Sent' }).eq('id', r.id);
            successCount++;
          } else {
            console.error('WhatsApp API Error for', r.id, await res.text());
            await supabaseAdmin.from('reminder_schedule').update({ status: 'Failed' }).eq('id', r.id);
            failCount++;
          }
        } catch (e) {
          console.error('Fetch Error for', r.id, e);
          await supabaseAdmin.from('reminder_schedule').update({ status: 'Failed' }).eq('id', r.id);
          failCount++;
        }
      } else {
        // Fallback: If no API keys, just mark as 'Ready' for manual send
        await supabaseAdmin.from('reminder_schedule').update({ status: 'Ready' }).eq('id', r.id);
        successCount++; // Counted as "successfully queued"
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${dueReminders.length} reminders. Success: ${successCount}, Failed: ${failCount}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
