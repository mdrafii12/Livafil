import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileBase64, mediaType } = await req.json();

    console.log("[EXTRACT-MEDICINES EDGE FUNCTION] Received image payload:", {
      mediaType,
      base64Length: fileBase64?.length || 0,
    });

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY");

    if (!apiKey) {
      console.warn("[EXTRACT-MEDICINES] GEMINI_API_KEY not configured in environment.");
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY not set",
          rawResponse: null,
          medicines: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const mimeType = mediaType || "image/jpeg";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `You are a precision pharmaceutical OCR assistant.
Analyze the provided medicine packaging, invoice, or prescription image.

CRITICAL OCR RULES:
1. Read the medicine brand name EXACTLY as printed. Do NOT guess or substitute similar-sounding medicine names.
2. Read the generic chemical composition, manufacturer name, strength, dosage form, batch number, MRP, and expiry date precisely from the visual text.
3. If text is blurry or uncertain, mark confidence as "low".

Return ONLY a valid JSON object matching this schema:
{
  "observedText": "Transcribed raw text from the image...",
  "medicines": [
    {
      "name": "Brand Name",
      "genericName": "Active Ingredient",
      "manufacturer": "Company Name",
      "strength": "500 mg",
      "dosageForm": "Tablet/Syrup/Capsule/Ointment",
      "barcode": "Barcode if visible",
      "prescriptionRequired": true/false,
      "batchNumber": "Batch Number",
      "expiryDate": "YYYY-MM-DD",
      "quantity": 10,
      "mrp": 50,
      "purchasePrice": 35,
      "confidence": "high" or "low"
    }
  ]
}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: fileBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
      },
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    const rawResult = await response.json();
    console.log("[EXTRACT-MEDICINES EDGE FUNCTION] RAW Gemini API Response:", JSON.stringify(rawResult));

    const responseText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("[EXTRACT-MEDICINES] Failed to parse JSON from Gemini text:", responseText);
    }

    return new Response(
      JSON.stringify({
        rawResponse: responseText,
        observedText: parsedData.observedText || "",
        medicines: parsedData.medicines || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[EXTRACT-MEDICINES] Exception during extraction:", error);
    return new Response(
      JSON.stringify({ error: error.message, medicines: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
