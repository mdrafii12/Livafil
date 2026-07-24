# 📖 Step-by-Step Guide: Connecting ElevenLabs Agent to Livafil

This step-by-step guide explains how to set up your **ElevenLabs Conversational AI Agent**, configure **Hindi (हिंदी)** and **Telugu (తెలుగు)** voices, define **Tools & Webhooks**, and connect it to your **Livafil** application.

---

## 🛠️ Step 1: Create Your Agent in ElevenLabs

1. Open your browser and go to [https://elevenlabs.io](https://elevenlabs.io).
2. Log into your account and click **"Conversational AI"** in the left sidebar navigation.
3. Click the **"+ Create Agent"** button.
4. Give your agent a name: `Livafil AI Medical Receptionist`.

---

## 🗣️ Step 2: Select Hindi & Telugu Multilingual Voice

1. In the Agent Dashboard, go to **"Voice Settings"**.
2. Select a natural, friendly voice (e.g. *Aria*, *Roger*, or *Sarah*).
3. Set **Model** to **`Eleven Multilingual v2`** or **`Eleven Turbo v2.5`**.
   > **Note:** `Eleven Multilingual v2` automatically handles **Hindi (हिंदी)**, **Telugu (తెలుగు)**, and **English** with natural accents!

---

## 📝 Step 3: Paste System Prompt & Greetings

### A. First Message (Greeting)
Paste this into the **First Message** box:
```text
Hello! Welcome to Livafil Clinic and Pharmacy. नमस्ते! लिवाफ़िल में आपका स्वागत है। నమస్కారం! లివాఫిల్ కి స్వాగతం. How can I assist you with your appointment or medicine today?
```

### B. System Prompt
Copy and paste this exact prompt into the **System Prompt** text area:

```text
# ROLE & PERSONALITY
You are "Livafil Voice Assistant" (लिवाफ़िल / లివాఫిల్), an intelligent, polite, and efficient medical receptionist for Livafil Pharmacy & OPD Clinic Suite.
Your primary job is to help patients book OPD doctor appointments, register new patients, check medicine stock availability, and handle prescription refill requests.

# LANGUAGES & TONE
- Primary Languages: Hindi (हिंदी), Telugu (తెలుగు), and English (including natural Hinglish and Teluglish).
- Always detect the user's spoken language automatically and respond fluently in the same language.
- Speak with warmth, clarity, empathy, and professional medical etiquette.
- Keep spoken responses concise (under 2-3 sentences) so the conversation feels natural over voice.

# CORE TASKS & STEPS

1. OPD DOCTOR APPOINTMENTS & PATIENT REGISTRATION:
   - Ask for: Patient Full Name, 10-digit Mobile Number, Age, Gender, and Preferred Doctor or Time Slot.
   - Example (Hindi): "नमस्ते! लिवाफ़िल ओपीडी में आपका स्वागत है। डॉक्टर अपॉइंटमेंट के लिए कृपया अपना नाम और फोन नंबर बताएं।"
   - Example (Telugu): "నమస్కారం! లివాఫిల్ OPD కి స్వాగతం. డాక్టర్ అపాయింట్‌మెంట్ కోసం దయచేసి మీ పేరు మరియు ఫోన్ నంబర్ చెప్పండి."
   - Confirm booking details clearly before calling the `book_opd_appointment` tool.

2. MEDICINE STOCK & PRICING INQUIRIES:
   - When a user or pharmacist asks about drug availability (e.g. Dolo 650, Augmentin, Pan 40), trigger `check_medicine_stock`.
   - Respond with available quantity, unit price, and shelf location.

# CONVERSATIONAL RULES & SAFETY
- Do not provide direct medical advice or change prescribed dosages. Advise patients to consult the OPD doctor.
- If the patient gives incomplete information (e.g. missing phone number), politely ask for the missing detail.
```

---

## ⚡ Step 4: Add Webhook Tools to ElevenLabs

In your ElevenLabs Agent dashboard, navigate to **Tools** $\rightarrow$ **+ Add Tool** $\rightarrow$ Select **Webhook**.

### Tool 1: `book_opd_appointment`
- **Tool Name:** `book_opd_appointment`
- **Description:** `Register patient and book OPD doctor appointment`
- **URL Endpoint:** `https://your-ngrok-domain.ngrok-free.app/api/elevenlabs/webhook`
- **HTTP Method:** `POST`
- **Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "patient_name": { "type": "string", "description": "Full name of patient" },
    "phone": { "type": "string", "description": "10-digit phone number" },
    "age": { "type": "integer", "description": "Age of patient" },
    "gender": { "type": "string", "enum": ["Male", "Female", "Other"] },
    "doctor_name": { "type": "string", "description": "Requested doctor name or OPD specialty" }
  },
  "required": ["patient_name", "phone"]
}
```

### Tool 2: `check_medicine_stock`
- **Tool Name:** `check_medicine_stock`
- **Description:** `Check drug stock and price in Livafil inventory`
- **URL Endpoint:** `https://your-ngrok-domain.ngrok-free.app/api/elevenlabs/webhook`
- **HTTP Method:** `POST`
- **Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "medicine_name": { "type": "string", "description": "Name or generic composition of medicine" }
  },
  "required": ["medicine_name"]
}
```

---

## 🚀 Step 5: Start Your Webhook Server Locally

We created a ready-to-run webhook server file in your project: `elevenlabs_webhook.js`.

1. Open your terminal in VS Code and run:
   ```bash
   node elevenlabs_webhook.js
   ```
2. In a second terminal, expose your server using **ngrok** so ElevenLabs can reach it:
   ```bash
   npx ngrok http 5000
   ```
3. Copy the `https://...ngrok-free.app` URL and paste it as the Webhook URL in ElevenLabs!

---

## 🧪 Step 6: Test Your Voice Agent!

1. In ElevenLabs, click **"Test Agent"** in the top right.
2. Speak in **Hindi** (*"नमस्ते, मुझे राजेश कुमार के लिए डॉक्टर शर्मा की अपॉइंटमेंट बुक करनी है"*).
3. Speak in **Telugu** (*"నమస్కారం, డోలో 650 టాబ్లెట్స్ స్టాక్ ఉందా?"*).
4. Watch ElevenLabs execute the tool call, trigger your `elevenlabs_webhook.js` server, and speak back the confirmed appointment details!
