import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff, ShieldCheck,
  Volume2, User, Clock, RefreshCw, Send, Sparkles,
  Radio, VolumeX
} from 'lucide-react';
import api from '../services/api';

interface QueueItem {
  campaign_borrower_id: number;
  campaign_id: number;
  campaign_name: string;
  borrower_id: number;
  borrower_name: string;
  borrower_phone: string;
  account_number: string;
  outstanding_amount: number;
  due_date: string;
  preferred_language: string;
  attempt_count: number;
  priority: number;
}

interface SimulatedCallSession {
  session_uuid: string;
  status: string;
  start_time: string;
  duration_seconds: number;
}

interface ChatMessage {
  sender: 'AI' | 'BORROWER' | 'SYSTEM';
  text: string;
  timestamp: string;
  emotion?: string;
  isSafetyEvent?: boolean;
}

export const SimulatedCallConsole: React.FC<{ campaignId?: number; onBack?: () => void }> = ({ campaignId = 1, onBack }) => {
  const [queueItem, setQueueItem] = useState<QueueItem | null>(null);
  const [activeSession, setActiveSession] = useState<SimulatedCallSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Microphone and recognition state
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Conversational state
  const [dialogue, setDialogue] = useState<ChatMessage[]>([]);
  const [borrowerInput, setBorrowerInput] = useState('');
  const [consecutiveDistress, setConsecutiveDistress] = useState(0);

  // Paralinguistic Acoustic State
  const [acousticState, setAcousticState] = useState({
    modelName: 'YUNCOX-Wav2Vec2-SVM-Candidate',
    predictedEmotion: 'neutral',
    confidence: 0.85,
    energyRms: 0.05,
    pitchF0: 155.0,
    snrDb: 26.4
  });

  // Deterministic Safety Action
  const [safetyAction, setSafetyAction] = useState({
    action: 'CONTINUE',
    reasonCode: 'SAFE_NOMINAL',
    plainReason: 'Interaction acoustic signals within compliant operations limits.',
    severity: 'INFO',
    isHandoffTriggered: false
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const measuredRmsRef = useRef<number>(0.04);
  const peakRmsRef = useRef<number>(0.04);
  const measuredPitchRef = useRef<number>(155.0);
  const activeSessionRef = useRef<any>(null);
  const queueItemRef = useRef<any>(null);
  const dialogueRef = useRef<any[]>([]);
  const consecutiveDistressRef = useRef<number>(0);
  const isListeningRef = useRef<boolean>(false);
  const handleSendStatementRef = useRef<((overrideText?: string) => Promise<void>) | null>(null);
  const speechCommitTimerRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const [speechLang, setSpeechLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const speechLangRef = useRef<'en-IN' | 'hi-IN'>('en-IN');
  const [liveVolumeLevel, setLiveVolumeLevel] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Fetch queue item
  const fetchNextBorrower = async () => {
    setIsLoading(true);
    try {
      const resp = await api.get(`/calling/queue/next/${campaignId}`);
      if (resp.data) {
        setQueueItem(resp.data);
        queueItemRef.current = resp.data;
      }
    } catch (err) {
      // Fallback display so UI is never blank
      const fallbackItem = {
        campaign_borrower_id: 1,
        campaign_id: 1,
        campaign_name: 'November High-Priority Recovery',
        borrower_id: 1,
        borrower_name: 'Aarav Sharma',
        borrower_phone: '+91 98201 12233',
        account_number: 'LON-MUM-88210',
        outstanding_amount: 45000,
        due_date: '2026-11-15',
        preferred_language: 'Hindi',
        attempt_count: 0,
        priority: 10
      };
      setQueueItem(fallbackItem);
      queueItemRef.current = fallbackItem;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNextBorrower();
  }, [campaignId]);

  // Duration Timer
  useEffect(() => {
    let interval: any = null;
    if (activeSession) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // Synchronize mutable refs across all render cycles
  useEffect(() => {
    activeSessionRef.current = activeSession;
    queueItemRef.current = queueItem;
    dialogueRef.current = dialogue;
    consecutiveDistressRef.current = consecutiveDistress;
    isListeningRef.current = isListening;
  });

  // Robust safe start helper that handles Chrome internal state transitions
  const safeStartRecognition = () => {
    if (!recognitionRef.current || !activeSessionRef.current || !isListeningRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (err: any) {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        if (activeSessionRef.current && isListeningRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }
      }, 200);
    }
  };

  // Robust Speech Recognition Setup (Continuous & Real-time Subtitles)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLangRef.current;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        const trimmedFinal = finalChunk.trim();
        if (trimmedFinal) {
          if (speechCommitTimerRef.current) clearTimeout(speechCommitTimerRef.current);
          setInterimTranscript('');
          handleSendStatementRef.current?.(trimmedFinal);
        } else if (interim.trim()) {
          const interimText = interim.trim();
          setInterimTranscript(interimText);
          // 1.8-second silence fallback: auto-commits if user pauses after speaking but Chrome didn't mark isFinal
          if (speechCommitTimerRef.current) clearTimeout(speechCommitTimerRef.current);
          speechCommitTimerRef.current = setTimeout(() => {
            setInterimTranscript('');
            handleSendStatementRef.current?.(interimText);
          }, 1800);
        }
      };

      recognition.onerror = (event: any) => {
        // 'no-speech' is a momentary pause; do NOT kill recognition
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          return;
        }
        if (event.error === 'not-allowed') {
          console.warn("Microphone access denied in browser.");
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        // Seamlessly auto-restart with 150ms buffer to allow Chrome internal audio release
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        if (activeSessionRef.current && isListeningRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            safeStartRecognition();
          }, 150);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (speechCommitTimerRef.current) clearTimeout(speechCommitTimerRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
    };
  }, []);

  // Waveform visualization with hardware echo cancellation
  const startAudioWaveform = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      mediaStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      renderCanvasWaveform();
    } catch (e) {
      renderSyntheticWaveform();
    }
  };

  const stopAudioWaveform = () => {
    if (speechCommitTimerRef.current) clearTimeout(speechCommitTimerRef.current);
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    setIsListening(false);
    isListeningRef.current = false;
  };

  // Autocorrelation pitch extraction on live browser audio stream
  const calculatePitchF0 = (buf: Float32Array, sampleRate: number): number => {
    const size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) {
      rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / size);
    if (rms < 0.015) return -1; // Floor limit

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
    }

    const sliced = buf.slice(r1, r2);
    const newSize = sliced.length;
    if (newSize < 2) return -1;

    const c = new Float32Array(newSize);
    for (let i = 0; i < newSize; i++) {
      let sum = 0;
      for (let j = 0; j < newSize - i; j++) {
        sum += sliced[j] * sliced[j + i];
      }
      c[i] = sum;
    }

    let d = 0;
    while (c[d] > c[d + 1] && d < newSize - 1) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < newSize; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    if (maxpos <= 0) return -1;
    return Math.round(sampleRate / maxpos);
  };

  const renderCanvasWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.fftSize;
    const timeBuffer = new Float32Array(bufferLength);
    let sampleCounter = 0;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getFloatTimeDomainData(timeBuffer);

      let sumSquares = 0;
      for (let i = 0; i < timeBuffer.length; i++) {
        sumSquares += timeBuffer[i] * timeBuffer[i];
      }
      const currentRms = Math.sqrt(sumSquares / timeBuffer.length);
      measuredRmsRef.current = currentRms;

      // Track Peak RMS during speech utterance
      if (currentRms > peakRmsRef.current) {
        peakRmsRef.current = currentRms;
      }

      // Pitch estimation every 4 frames
      sampleCounter++;
      if (sampleCounter % 4 === 0 && currentRms > 0.02 && audioContextRef.current) {
        const pitch = calculatePitchF0(timeBuffer, audioContextRef.current.sampleRate);
        if (pitch >= 80 && pitch <= 450) {
          measuredPitchRef.current = pitch;
        }
        setLiveVolumeLevel(Math.min(100, Math.round(currentRms * 350)));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = safetyAction.isHandoffTriggered
        ? '#ef4444'
        : currentRms > 0.08
          ? '#f43f5e'
          : (isListening ? '#10b981' : '#6366f1');
      ctx.beginPath();

      const sliceWidth = canvas.width / timeBuffer.length;
      let x = 0;
      for (let i = 0; i < timeBuffer.length; i++) {
        const v = timeBuffer[i];
        const y = (canvas.height / 2) + (v * (canvas.height / 2) * 1.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    };
    draw();
  };

  const renderSyntheticWaveform = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      step += 0.05;
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = safetyAction.isHandoffTriggered ? '#ef4444' : (activeSession ? '#6366f1' : '#27272a');
      ctx.beginPath();
      const amp = activeSession ? 14 : 2;
      for (let x = 0; x < canvas.width; x += 3) {
        const y = canvas.height / 2 + Math.sin(x * 0.05 + step) * amp * Math.sin(step * 0.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw();
  };

  const speakVoice = (text: string) => {
    if ('speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.0;
      utt.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      // Find high quality Indian female or male voice
      const preferredVoice = voices.find(v =>
        (v.lang.includes('IN') || v.lang.includes('hi') || v.name.includes('India') || v.name.includes('Hindi')) &&
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Heera') || v.name.includes('Priya') || v.name.includes('Neerja'))
      ) || voices.find(v => v.lang.includes('IN') || v.lang.includes('hi')) || voices[0];

      if (preferredVoice) {
        utt.voice = preferredVoice;
      }
      utt.lang = 'hi-IN';
      window.speechSynthesis.speak(utt);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Microphone recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch (e) { }
    } else {
      isListeningRef.current = true;
      setIsListening(true);
      safeStartRecognition();
    }
  };

  // Start Call
  const handleStartCall = async () => {
    const queue = queueItemRef.current || queueItem;
    if (!queue) return;
    setIsLoading(true);
    try {
      const resp = await api.post('/calling/sessions/initiate', {
        campaign_id: queue.campaign_id,
        borrower_id: queue.borrower_id
      });
      activeSessionRef.current = resp.data;
      setActiveSession(resp.data);
      consecutiveDistressRef.current = 0;
      setConsecutiveDistress(0);

      await startAudioWaveform();

      const greeting = `Namaste ${queue.borrower_name} ji, main Bank Customer Operations se baat kar rahi hoon. Aapke account ${queue.account_number} ke EMI overdue payment ke silsile mein sampark kiya hai. Kya aap sun paa rahe hain?`;

      const initialMsgs: ChatMessage[] = [
        {
          sender: 'SYSTEM' as const,
          text: `Encrypted Voice Session Connected [${queue.borrower_name}]`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          sender: 'AI' as const,
          text: greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setDialogue(initialMsgs);
      dialogueRef.current = initialMsgs;
      speakVoice(greeting);

      isListeningRef.current = true;
      setIsListening(true);
      safeStartRecognition();
    } catch (e) {
      console.warn('Call start error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Send statement (100% voice & text driven, zero simulation buttons)
  const handleSendStatement = async (overrideText?: string) => {
    const curSession = activeSessionRef.current || activeSession;
    if (!curSession) {
      console.warn("handleSendStatement skipped: No active session activeSessionRef.current");
      return;
    }
    const text = overrideText || borrowerInput.trim();
    if (!text) return;

    setBorrowerInput('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newBorrowerTurn: ChatMessage = { sender: 'BORROWER' as const, text, timestamp: timeStr };
    setDialogue((prev: ChatMessage[]) => {
      const updated = [...prev, newBorrowerTurn];
      dialogueRef.current = updated;
      return updated;
    });

    // Grab true acoustic measurements only if from voice; if typed, use neutral calm baseline
    const isFromVoice = Boolean(overrideText);
    const capturedEnergy = isFromVoice ? (peakRmsRef.current > 0.02 ? peakRmsRef.current : measuredRmsRef.current) : 0.04;
    const capturedPitch = isFromVoice ? measuredPitchRef.current : 150.0;
    peakRmsRef.current = 0.02; // Reset peak for next turn

    const queue = queueItemRef.current || queueItem;
    const hist = dialogueRef.current;
    const distress = consecutiveDistressRef.current ?? consecutiveDistress;

    try {
      const resp = await api.post('/calling/sessions/dialogue', {
        session_uuid: curSession.session_uuid,
        borrower_statement: text,
        borrower_name: queue?.borrower_name,
        account_number: queue?.account_number,
        outstanding_amount: queue?.outstanding_amount,
        preferred_language: queue?.preferred_language,
        history: hist,
        consecutive_distress: distress,
        measured_energy: capturedEnergy,
        measured_pitch: capturedPitch
      });

      const d = resp.data;
      setAcousticState({
        modelName: 'YUNCOX-Wav2Vec2-SVM-Candidate',
        predictedEmotion: d.predicted_emotion,
        confidence: d.confidence,
        energyRms: d.energy_rms,
        pitchF0: d.pitch_f0,
        snrDb: d.snr_db
      });

      setSafetyAction({
        action: d.safety_action,
        reasonCode: d.reason_code,
        plainReason: d.plain_reason,
        severity: d.is_handoff_triggered ? 'CRITICAL' : 'INFO',
        isHandoffTriggered: d.is_handoff_triggered
      });

      if (d.predicted_emotion === 'angry') {
        consecutiveDistressRef.current = (consecutiveDistressRef.current || 0) + 1;
        setConsecutiveDistress(consecutiveDistressRef.current);
      } else {
        consecutiveDistressRef.current = 0;
        setConsecutiveDistress(0);
      }

      const newAiTurn: ChatMessage = {
        sender: 'AI' as const,
        text: d.ai_response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion: d.predicted_emotion,
        isSafetyEvent: d.is_handoff_triggered
      };
      setDialogue((prev: ChatMessage[]) => {
        const updated = [...prev, newAiTurn];
        dialogueRef.current = updated;
        return updated;
      });

      speakVoice(d.ai_response);
    } catch (e) {
      console.error('Dialogue error:', e);
    }
  };

  // Synchronize the reference to the latest handleSendStatement function on every render
  handleSendStatementRef.current = handleSendStatement;

  const handleEndCall = async () => {
    const curSession = activeSessionRef.current || activeSession;
    if (!curSession) return;
    setIsLoading(true);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopAudioWaveform();
    try {
      await api.post('/calling/sessions/terminate', {
        session_uuid: curSession.session_uuid,
        outcome: safetyAction.isHandoffTriggered ? 'ESCALATED' : 'COMPLETED'
      });
      activeSessionRef.current = null;
      setActiveSession(null);
      isListeningRef.current = false;
      setIsListening(false);
      setDialogue([]);
      dialogueRef.current = [];
      await fetchNextBorrower();
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/60 flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white flex items-center space-x-2">
                <span>Autonomous Voice Recovery Workstation</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                  VOXGUARD 2.0
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time acoustic emotion intelligence & deterministic compliance handoff engine.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <Radio className={`w-3.5 h-3.5 ${activeSession ? 'text-emerald-400 animate-pulse' : 'text-zinc-600'}`} />
            <span className="text-zinc-400 font-medium">Channel:</span>
            <span className="text-zinc-200 font-mono">{activeSession ? 'LIVE ENCRYPTED' : 'STANDBY'}</span>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-300 transition"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Main SaaS Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (4 cols): Borrower Dossier */}
        <div className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Borrower Record</span>
            </span>
            <button
              onClick={fetchNextBorrower}
              disabled={isLoading || !!activeSession}
              className="text-xs text-zinc-400 hover:text-indigo-400 flex items-center space-x-1 disabled:opacity-40 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Fetch Next</span>
            </button>
          </div>

          {queueItem && (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-zinc-500 text-[11px] block">Borrower Name</span>
                <span className="text-sm font-semibold text-white">{queueItem.borrower_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] block">Overdue EMI</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">₹{queueItem.outstanding_amount.toLocaleString()}</span>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] block">Due Date</span>
                  <span className="text-xs font-mono text-zinc-200 mt-1 block">{queueItem.due_date}</span>
                </div>
              </div>

              <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/60 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Contact:</span>
                  <span className="font-mono text-zinc-300">{queueItem.borrower_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Account Ref:</span>
                  <span className="font-mono text-indigo-400">{queueItem.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Dialect:</span>
                  <span className="font-medium text-zinc-200">{queueItem.preferred_language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Queue Priority:</span>
                  <span className="font-mono text-amber-400">P{queueItem.priority} High</span>
                </div>
              </div>

              <div className="pt-2">
                {!activeSession ? (
                  <button
                    onClick={handleStartCall}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition active:scale-[0.99]"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Initiate Voice Call</span>
                  </button>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="w-full py-2.5 px-4 bg-rose-600/90 hover:bg-rose-500 text-white font-medium rounded-xl text-xs flex items-center justify-center space-x-2 transition"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Conclude Call Session</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center Column (5 cols): Live Conversation & Audio Stream */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between h-[580px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 flex items-center space-x-2">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Audio Stream & Transcript</span>
              </span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSession ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                  {activeSession ? 'CONNECTED' : 'IDLE'}
                </span>
                {activeSession && (
                  <span className="text-xs font-mono text-zinc-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{formatSec(callDuration)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Obsidian Waveform Box */}
            <div className="bg-zinc-950 rounded-xl border border-zinc-800/80 p-2 my-3 h-16 relative overflow-hidden flex items-center justify-center">
              <canvas ref={canvasRef} width={420} height={50} className="w-full h-full rounded" />
              {activeSession && isListening && (
                <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[9px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>MIC RECORDING</span>
                </div>
              )}
            </div>
          </div>

          {/* Dialogue Log */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {/* Live Handoff Alert Banner */}
            {safetyAction.isHandoffTriggered && (
              <div className="p-3.5 bg-red-950/70 border-2 border-red-500 rounded-xl flex items-center justify-between text-xs text-red-200 shadow-xl shadow-red-950/60 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping shrink-0" />
                  <div>
                    <span className="font-bold text-white uppercase tracking-wider block text-[11px]">
                      COLLECTION PRESSURE HALTED: HUMAN SPECIALIST HANDOFF
                    </span>
                    <span className="text-[10px] text-red-300 font-mono">
                      Reason: {safetyAction.plainReason}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold tracking-widest shrink-0">
                  ESCALATED
                </span>
              </div>
            )}

            {dialogue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2">
                <Radio className="w-6 h-6 text-zinc-700" />
                <span>Click "Initiate Voice Call" to begin customer operations.</span>
              </div>
            ) : (
              dialogue.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl transition-all shadow-sm ${msg.sender === 'AI'
                    ? (msg.isSafetyEvent
                      ? 'bg-red-950/40 border border-red-800/80 text-red-100 shadow-red-950/30'
                      : 'bg-zinc-800/90 border border-zinc-700/60 text-zinc-100 ml-4')
                    : msg.sender === 'BORROWER'
                      ? 'bg-zinc-900 border border-zinc-750 text-zinc-200 mr-4'
                      : 'bg-zinc-950 text-zinc-400 text-center text-[10px] py-1.5'
                    }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {msg.sender === 'AI' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-zinc-200">Axis Customer Operations (Priya)</span>
                        </>
                      ) : msg.sender === 'BORROWER' ? (
                        <>
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-zinc-200">Borrower (Voice Audio)</span>
                        </>
                      ) : (
                        <span>System Event</span>
                      )}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed text-xs font-normal">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Microphone & Send Controls */}
          {activeSession && (
            <div className="pt-3 border-t border-zinc-800/60 space-y-2.5">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMic}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border transition ${isListening
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/30 animate-pulse'
                    : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                    }`}
                >
                  {isListening ? <Mic className="w-4 h-4 text-zinc-950" /> : <MicOff className="w-4 h-4 text-zinc-400" />}
                  <span>{isListening ? 'Microphone Recording — Speak In Hindi / English' : 'Click to Speak via Microphone'}</span>
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition"
                  title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
                </button>
                <button
                  onClick={() => {
                    const nextLang = speechLang === 'en-IN' ? 'hi-IN' : 'en-IN';
                    setSpeechLang(nextLang);
                    speechLangRef.current = nextLang;
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.lang = nextLang;
                      } catch (e) { }
                    }
                  }}
                  className="px-3 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 hover:text-emerald-400 transition text-[11px] font-mono font-bold"
                  title={`Current Mic Language: ${speechLang}. Click to toggle English/Hindi`}
                >
                  {speechLang === 'en-IN' ? 'EN' : 'HI'}
                </button>
              </div>

              {/* Real-time Voice Acoustic Telemetry Bar */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                  <span className="text-[11px] font-mono text-zinc-300">
                    {isListening ? 'LIVE AUDIO ANALYSER: LISTENING TO MICROPHONE' : 'MICROPHONE STANDBY'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-mono">
                  <div className="flex items-center space-x-1.5 text-zinc-400">
                    <span>MIC ENERGY:</span>
                    <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-75 ${liveVolumeLevel > 60 ? 'bg-red-500' : liveVolumeLevel > 25 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                        style={{ width: `${Math.max(6, Math.min(100, liveVolumeLevel))}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-zinc-400">
                    PITCH: <span className="text-emerald-400 font-bold">{measuredPitchRef.current} Hz</span>
                  </span>
                </div>
              </div>

              {/* Real-time speech transcription preview */}
              {interimTranscript && (
                <div className="flex items-center space-x-2.5 px-3.5 py-2.5 bg-emerald-950/50 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs shadow-lg shadow-emerald-950/40 animate-pulse">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-emerald-400 text-[10px] uppercase font-mono tracking-wider">Hearing Now:</span>
                  <span className="italic font-mono text-zinc-100 flex-1 truncate">"{interimTranscript}"</span>
                </div>
              )}

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={borrowerInput}
                  onChange={(e) => setBorrowerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendStatement()}
                  placeholder="Boliye (Mic On) ya yahan message type karein..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  onClick={() => handleSendStatement()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (3 cols): YUNCOX Emotion & Deterministic Safety Engine */}
        <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acoustic Paralinguistics</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">VOICE ONLY</span>
          </div>

          {/* Emotion Card */}
          <div className={`p-4 rounded-xl border transition-all ${acousticState.predictedEmotion === 'angry'
            ? 'bg-red-950/40 border-red-500 text-white shadow-xl shadow-red-950/40'
            : acousticState.predictedEmotion === 'sad'
              ? 'bg-amber-950/40 border-amber-500 text-amber-200'
              : acousticState.predictedEmotion === 'happy'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
            }`}>
            <div className="flex justify-between items-center pb-1">
              <span className="text-zinc-400 text-[10px] uppercase font-mono tracking-wider">YUNCOX SER Engine</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Audio Raw</span>
            </div>

            <div className="flex items-center justify-between my-2">
              <span className={`text-xl font-black uppercase tracking-wider ${acousticState.predictedEmotion === 'angry' ? 'text-red-400 animate-pulse' :
                acousticState.predictedEmotion === 'sad' ? 'text-amber-400' :
                  acousticState.predictedEmotion === 'happy' ? 'text-emerald-400' : 'text-zinc-200'
                }`}>
                {acousticState.predictedEmotion}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750">
                {Math.round(acousticState.confidence * 100)}% Conf
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[10px]">Pitch F0</span>
                <span className="font-mono text-zinc-200 font-semibold">{acousticState.pitchF0} Hz</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">RMS Energy</span>
                <span className="font-mono text-zinc-200 font-semibold">{acousticState.energyRms}</span>
              </div>
            </div>

            <div className="flex justify-between text-[10px] pt-2 border-t border-zinc-800/60 font-mono text-zinc-500">
              <span>Model Head:</span>
              <span className="text-zinc-400">Wav2Vec2 + MFCC + SVM</span>
            </div>
          </div>

          {/* Deterministic Safety Action Directive */}
          <div className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${safetyAction.isHandoffTriggered
            ? 'bg-red-950/50 border-red-500 text-red-100 shadow-2xl shadow-red-950/50 ring-1 ring-red-500/50'
            : safetyAction.action === 'PAUSE'
              ? 'bg-amber-950/30 border-amber-800 text-amber-300'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
            }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Safety Policy Action
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold tracking-wider ${safetyAction.isHandoffTriggered ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-200'
                }`}>
                {safetyAction.action}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-200 font-medium pt-1">
              {safetyAction.plainReason}
            </p>

            <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800/60 font-mono">
              <span>Reason Code:</span>
              <span className="text-zinc-300 font-bold">{safetyAction.reasonCode}</span>
            </div>
          </div>

          {/* Specialist Pod Routing Telemetry */}
          <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs space-y-1.5 font-mono text-[10px]">
            <div className="flex items-center justify-between text-zinc-400">
              <span>ACOUSTIC SER:</span>
              <span className="text-emerald-400 font-semibold">YUNCOX PARALINGUISTICS ACTIVE</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>SAFETY GOVERNANCE:</span>
              <span className="text-zinc-200">DETERMINISTIC OVERRIDE</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>SPECIALIST POD:</span>
              <span className={safetyAction.isHandoffTriggered ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-500'}>
                {safetyAction.isHandoffTriggered ? 'ESCALATION BRIDGED' : 'STANDBY (0 IN QUEUE)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
