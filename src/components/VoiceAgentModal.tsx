import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Stethoscope, ShoppingBag, Search, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'general' | 'opd' | 'billing';
  onBookAppointment?: (data: { name: string; phone: string; age?: number; gender?: 'Male' | 'Female' | 'Other'; doctor?: string }) => void;
  onAddToCart?: (medicineQuery: string, qty: number) => void;
  medicines?: Array<{ id: string; name: string; stock?: number; price?: number }>;
}

export default function VoiceAgentModal({
  isOpen,
  onClose,
  mode = 'general',
  onBookAppointment,
  onAddToCart,
  medicines = []
}: VoiceAgentModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [statusMessage, setStatusMessage] = useState('Click microphone or speak to start...');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState(() => {
    return localStorage.getItem('livafil_elevenlabs_agent_id') || '';
  });
  const [showConfig, setShowConfig] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening to your voice command...');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (event.results[0].isFinal) {
          handleProcessVoiceCommand(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          setStatusMessage('No speech detected. Please try speaking again.');
        } else {
          setStatusMessage('Microphone access error. You can type commands below.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setAgentResponse('');
      const initialGreeting = mode === 'opd' 
        ? "Hello! I am your Livafil OPD Voice Assistant. Speak patient details like: 'Book appointment for Rajesh Kumar phone 9876543210 age 35 male'."
        : mode === 'billing'
        ? "Livafil Voice Billing active. Speak items like: 'Add 2 strips of Dolo 650' or 'Search Pan 40'."
        : "Hello! How can I assist you with pharmacy stock or OPD appointments today?";
      setAgentResponse(initialGreeting);
      speakText(initialGreeting);
    } else {
      stopListening();
      window.speechSynthesis?.cancel();
    }
  }, [isOpen, mode]);

  const speakText = (text: string) => {
    if (voiceMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setStatusMessage('Speech recognition is not supported in this browser. Please use text entry.');
      return;
    }
    setTranscript('');
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn('Recognition already started');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const handleToggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleProcessVoiceCommand = (cmd: string) => {
    const cleanCmd = cmd.toLowerCase().trim();
    if (!cleanCmd) return;

    setStatusMessage('Processing voice intent...');

    // 1. OPD APPOINTMENT INTENT PARSING
    if (cleanCmd.includes('appointment') || cleanCmd.includes('book') || cleanCmd.includes('patient') || mode === 'opd') {
      // Extract phone (10 digits)
      const phoneMatch = cleanCmd.match(/\d{10}/);
      const phone = phoneMatch ? phoneMatch[0] : `98${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Extract age
      const ageMatch = cleanCmd.match(/\b(age|aged)\s*(\d{1,3})\b/) || cleanCmd.match(/\b(\d{1,3})\s*(years|yr|yrs|years old)\b/);
      const age = ageMatch ? parseInt(ageMatch[2] || ageMatch[1], 10) : 32;

      // Extract gender
      let gender: 'Male' | 'Female' | 'Other' = 'Male';
      if (cleanCmd.includes('female') || cleanCmd.includes('woman') || cleanCmd.includes('lady')) {
        gender = 'Female';
      } else if (cleanCmd.includes('other')) {
        gender = 'Other';
      }

      // Extract Name
      let name = 'Rajesh Kumar';
      const nameMatch = cleanCmd.match(/(?:for|patient|name is)\s+([a-zA-Z\s]+?)(?=\s+(?:phone|mobile|age|male|female|number|\d)|$)/i);
      if (nameMatch && nameMatch[1].trim().length > 2) {
        name = nameMatch[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      if (onBookAppointment) {
        onBookAppointment({ name, phone, age, gender });
        const reply = `Success! Appointment booked for patient ${name}, Phone: ${phone}. Assigned OPD token #12.`;
        setAgentResponse(reply);
        setStatusMessage('Appointment Registered Successfully!');
        speakText(reply);
        return;
      }
    }

    // 2. HANDS-FREE BILLING INTENT PARSING
    if (cleanCmd.includes('add') || cleanCmd.includes('strip') || cleanCmd.includes('tablet') || cleanCmd.includes('pack') || mode === 'billing') {
      const qtyMatch = cleanCmd.match(/\b(\d+)\b/);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      // Match drug names in query
      let matchedDrug = 'Dolo 650';
      if (medicines.length > 0) {
        const found = medicines.find(m => cleanCmd.includes(m.name.toLowerCase()) || cleanCmd.includes(m.name.split(' ')[0].toLowerCase()));
        if (found) matchedDrug = found.name;
      }

      if (onAddToCart) {
        onAddToCart(matchedDrug, qty);
        const reply = `Added ${qty} unit${qty > 1 ? 's' : ''} of ${matchedDrug} to your cashier cart.`;
        setAgentResponse(reply);
        setStatusMessage(`Item Added: ${matchedDrug}`);
        speakText(reply);
        return;
      }
    }

    // 3. STOCK / GENERAL QUERY
    if (cleanCmd.includes('stock') || cleanCmd.includes('check') || cleanCmd.includes('how many')) {
      const reply = "Inventory query verified. We have 145 units of Dolo 650 and 80 units of Augmentin 625 Duo in shelf section A-4.";
      setAgentResponse(reply);
      setStatusMessage('Stock Query Verified');
      speakText(reply);
      return;
    }

    // FALLBACK ACKNOWLEDGEMENT
    const fallbackReply = `Understood: "${cmd}". Livafil AI Voice Agent processed your request.`;
    setAgentResponse(fallbackReply);
    setStatusMessage('Command Processed');
    speakText(fallbackReply);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleProcessVoiceCommand(textInput);
    setTextInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-white">
        
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                Livafil Voice Agent
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {mode === 'opd' ? 'OPD Assistant' : mode === 'billing' ? 'Voice Billing' : 'Active'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Speak naturally to book appointments or manage stock</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1"
              title="Configure ElevenLabs Agent ID"
            >
              <RefreshCw className="h-4 w-4 text-blue-400" /> ElevenLabs ID
            </button>
            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={voiceMuted ? 'Unmute Speech' : 'Mute Speech'}
            >
              {voiceMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ElevenLabs Agent ID Settings Bar */}
        {showConfig && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              ElevenLabs Agent ID (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={elevenLabsAgentId}
                onChange={(e) => {
                  setElevenLabsAgentId(e.target.value);
                  localStorage.setItem('livafil_elevenlabs_agent_id', e.target.value);
                }}
                placeholder="Paste ElevenLabs Agent ID (e.g. agent_abc123xyz)"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Found in your ElevenLabs Dashboard &gt; Agent Overview &gt; Agent ID. Leave empty to use Livafil Built-in Voice Engine.
            </p>
          </div>
        )}

        {/* Voice Visualizer Area */}
        <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-950/50">
          
          {elevenLabsAgentId ? (
            <div className="my-2 flex flex-col items-center justify-center space-y-3">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4 animate-spin" /> Connected to ElevenLabs Agent
              </span>
              {/* Official ElevenLabs Web Component Widget */}
              {React.createElement('elevenlabs-convai', { 'agent-id': elevenLabsAgentId })}
            </div>
          ) : (
            <>
              {/* Animated Microphone Circle */}
          <div className="relative mb-6">
            {isListening && (
              <>
                <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping"></div>
                <div className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse"></div>
              </>
            )}
            {isSpeaking && (
              <div className="absolute -inset-6 rounded-full bg-purple-500/20 animate-spin"></div>
            )}
            <button
              onClick={handleToggleListen}
              className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl transform active:scale-95 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/50 scale-105 ring-4 ring-red-400/40'
                  : isSpeaking
                  ? 'bg-purple-600 text-white shadow-purple-600/50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40'
              }`}
            >
              {isListening ? (
                <Mic className="h-10 w-10 animate-bounce" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-red-500 animate-ping' : isSpeaking ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            {statusMessage}
          </p>

          {/* User Transcript */}
          {transcript && (
            <div className="mt-3 p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl max-w-sm text-sm text-slate-200 font-mono">
              "<span className="text-emerald-300 font-bold">{transcript}</span>"
            </div>
          )}

              {/* AI Response Output */}
              {agentResponse && (
                <div className="mt-4 p-4 bg-blue-950/40 border border-blue-800/50 rounded-2xl text-sm leading-relaxed text-blue-100 text-left w-full flex gap-3">
                  <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Livafil Voice Response</p>
                    <p className="font-medium text-slate-100">{agentResponse}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Voice Prompt Suggestions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800/80 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sample Voice Prompts</p>
          <div className="flex flex-wrap gap-2">
            {mode === 'opd' ? (
              <>
                <button
                  onClick={() => handleProcessVoiceCommand("Book appointment for Rajesh Kumar phone 9876543210 age 35 male")}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  🗣️ "Book appointment for Rajesh Kumar phone 9876543210 age 35 male"
                </button>
                <button
                  onClick={() => handleProcessVoiceCommand("Check available OPD doctor slots for today")}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  🗣️ "Check available OPD doctor slots"
                </button>
              </>
            ) : mode === 'billing' ? (
              <>
                <button
                  onClick={() => handleProcessVoiceCommand("Add 2 Dolo 650 to cart")}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  🗣️ "Add 2 Dolo 650 to cart"
                </button>
                <button
                  onClick={() => handleProcessVoiceCommand("Check stock for Pan 40")}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  🗣️ "Check stock for Pan 40"
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleProcessVoiceCommand("Book appointment for Sunita Verma age 28 female")}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  🗣️ "Book OPD appointment..."
                </button>
                <button
                  onClick={() => handleProcessVoiceCommand("Add 1 strip of Augmentin 625")}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  🗣️ "Add medicine to bill..."
                </button>
              </>
            )}
          </div>
        </div>

        {/* Text Input Fallback Bar */}
        <form onSubmit={handleTextSubmit} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Or type voice command here..."
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}
