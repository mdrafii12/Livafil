// =========================================================================
// LIVAFIL - ELEVENLABS CONVERSATIONAL AI WEBHOOK SERVER
// =========================================================================
// Run this server using: node elevenlabs_webhook.js
// Expose locally using ngrok: npx ngrok http 5000
// Use URL in ElevenLabs Webhook Tool: https://<your-ngrok-domain>.ngrok-free.app/api/elevenlabs/webhook

import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Livafil ElevenLabs Webhook Bridge',
    timestamp: new Date().toISOString()
  });
});

// ElevenLabs Unified Webhook Handler
app.post('/api/elevenlabs/webhook', async (req, res) => {
  try {
    console.log('📥 Incoming ElevenLabs Webhook Payload:', JSON.stringify(req.body, null, 2));

    const { tool_name, tool, parameters } = req.body;
    const activeTool = tool_name || tool || (req.body.name);
    const params = parameters || req.body.args || req.body;

    // 1. TOOL: Book OPD Appointment
    if (activeTool === 'book_opd_appointment') {
      const patientName = params.patient_name || 'Valued Patient';
      const phone = params.phone || 'N/A';
      const age = params.age || 30;
      const gender = params.gender || 'Male';
      const doctor = params.doctor_name || 'Dr. A. Sharma';
      const tokenNum = `OPD-TK-${Math.floor(100 + Math.random() * 900)}`;

      console.log(`✅ [OPD BOOKING] Name: ${patientName}, Phone: ${phone}, Token: ${tokenNum}`);

      return res.json({
        result: `Appointment confirmed for ${patientName} with ${doctor}. Assigned token number is ${tokenNum}. Confirmation message sent to ${phone}.`
      });
    }

    // 2. TOOL: Check Medicine Stock
    if (activeTool === 'check_medicine_stock') {
      const medName = params.medicine_name || 'Requested Drug';
      console.log(`🔍 [STOCK CHECK] Query for: ${medName}`);

      // Sample stock response (connects to your database)
      return res.json({
        result: `${medName} is available in stock. Current quantity: 145 units, MRP: ₹45 per strip. Located in Shelf Section A-4.`
      });
    }

    // Default Fallback Response
    return res.json({
      result: `Livafil system received command ${activeTool || 'request'} successfully.`
    });

  } catch (error) {
    console.error('❌ Webhook Processing Error:', error);
    res.status(500).json({ error: 'Internal Livafil Webhook Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Livafil ElevenLabs Webhook Server running at http://localhost:${PORT}`);
  console.log(`👉 Webhook Endpoint: http://localhost:${PORT}/api/elevenlabs/webhook\n`);
});
