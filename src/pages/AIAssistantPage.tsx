import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { runAIJob, normalizeBase64, inferMimeType } from '../lib/ai';
import { useToast } from '../components/ui/ToastProvider';
import { useAccessibility } from '../hooks/useAccessibility';
import { LoadingText } from '../components/ui/LoadingText';
import { SkeletonList } from '../components/ui/Skeleton';
import MascotAnimation from '../components/ui/MascotAnimation';

// Minimal Web Speech API typings (not in lib.dom for all TS versions)
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultLike {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}
interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
}

export function AIAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', text: '¡Hola! Soy Physi, tu asistente de fisioterapia de FisioMirror. ¿En qué puedo ayudarte hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const toast = useToast();
  const { speak } = useAccessibility();

  useEffect(() => {
    loadConversation();
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('ai_conversations')
        .select('role, content, images')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (data && data.length > 0) {
        setMessages(data.map((d, i) => ({
          id: `db-${i}`,
          role: d.role as 'user' | 'assistant',
          text: d.content,
          images: d.images ?? undefined,
        })));
      }
    } catch {
      // keep default message
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Clean up any active recording/stream when the component unmounts
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const transcribeWithWebSpeech = (): boolean => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return false;
    const recognition = new Ctor();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (ev: SpeechRecognitionEventLike) => {
      const result = ev.results[ev.results.length - 1];
      const transcript = result[0]?.transcript?.trim();
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      toast.error('No se pudo transcribir el audio');
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    // Prefer Web Speech API when available (live transcription, no blob needed)
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      setIsRecording(true);
      if (!transcribeWithWebSpeech()) {
        setIsRecording(false);
        toast.info('La entrada por voz requiere Chrome');
      }
      return;
    }

    // Fallback: MediaRecorder + transcription would need a backend; not supported here
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        setIsRecording(false);
        // Web Speech API not available — we cannot transcribe locally
        toast.info('La entrada por voz requiere Chrome');
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: input,
      images: images.length > 0 ? images : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    const messageText = input;
    setInput('');
    const sentImages = images;
    setImages([]);
    setLoading(true);

    try {
      // Save user message to DB
      await supabase.from('ai_conversations').insert({
        user_id: user?.id,
        role: 'user',
        content: messageText,
        images: sentImages.length > 0 ? sentImages : null,
      });

      // Auto-fetch patient data from Supabase to build personalized context
      let contextStr = '';
      const inputContext: Record<string, unknown> = {};

      if (user?.id) {
        // 1. User profile (name, email, role, diagnostico, fecha_nacimiento)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, role, diagnostico, fecha_nacimiento')
          .eq('id', user.id)
          .maybeSingle();

        // 2. Last 5 completed sessions
        const { data: sessions } = await supabase
          .from('sesiones_completadas')
          .select('fecha, ejercicio_nombre, duracion_segundos, repeticiones, calidad_ejecucion, dolor_reportado')
          .eq('paciente_id', user.id)
          .order('fecha', { ascending: false })
          .limit(5);

        // 3. Assigned active exercises
        const { data: exercises } = await supabase
          .from('patient_exercises')
          .select('ejercicio_nombre, series, repeticiones, frecuencia_semana, notas')
          .eq('paciente_id', user.id)
          .eq('activo', true);

        // 4. Current streak (consecutive days with sessions, counting back from today)
        let currentStreak = 0;
        if (sessions && sessions.length > 0) {
          const sessionDays = new Set(
            sessions.map((s) => new Date(s.fecha).toISOString().slice(0, 10))
          );
          const today = new Date();
          for (let i = 0; i < 365; i++) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);
            const dayStr = day.toISOString().slice(0, 10);
            if (sessionDays.has(dayStr)) {
              currentStreak++;
            } else if (i > 0) {
              // allow today to be empty (no session yet today) but break on first gap after
              break;
            }
          }
        }

        inputContext.profile = profile ?? {};
        inputContext.sessions = sessions ?? [];
        inputContext.exercises = exercises ?? [];
        inputContext.currentStreak = currentStreak;

        // Build human-readable context string
        const lines: string[] = [];
        if (profile) {
          lines.push(`Nombre: ${profile.full_name ?? 'N/A'}`);
          lines.push(`Email: ${profile.email ?? 'N/A'}`);
          lines.push(`Rol: ${profile.role ?? 'N/A'}`);
          if (profile.diagnostico) lines.push(`Diagnóstico: ${profile.diagnostico}`);
          if (profile.fecha_nacimiento) {
            lines.push(`Fecha de nacimiento: ${new Date(profile.fecha_nacimiento).toLocaleDateString('es-ES')}`);
          }
        }
        lines.push(`Racha actual (días consecutivos): ${currentStreak}`);

        if (sessions && sessions.length > 0) {
          lines.push('Últimas sesiones:');
          sessions.forEach((s) => {
            lines.push(
              `  - ${new Date(s.fecha).toLocaleDateString('es-ES')}: ${s.ejercicio_nombre || 'Ejercicio'} | ` +
              `${s.repeticiones ?? 0} reps | ${s.duracion_segundos ?? 0}s | calidad ${s.calidad_ejecucion ?? 0}%` +
              (s.dolor_reportado != null ? ` | dolor ${s.dolor_reportado}/10` : '')
            );
          });
        } else {
          lines.push('Últimas sesiones: ninguna registrada');
        }

        if (exercises && exercises.length > 0) {
          lines.push('Ejercicios asignados (activos):');
          exercises.forEach((ex) => {
            lines.push(
              `  - ${ex.ejercicio_nombre || 'Ejercicio'} | ${ex.series ?? 0}x${ex.repeticiones ?? 0} | ` +
              `${ex.frecuencia_semana ?? 0} días/sem` + (ex.notas ? ` | ${ex.notas}` : '')
            );
          });
        } else {
          lines.push('Ejercicios asignados: ninguno activo');
        }

        contextStr = lines.join('\n');
      }

      const spanishInstruction = 'IMPORTANTE: Responde SIEMPRE en español. Nunca uses inglés.';
      const fullPrompt = contextStr
        ? `Contexto del paciente: ${contextStr}\n\n${spanishInstruction}\n\nPregunta del paciente: ${messageText}`
        : `${spanishInstruction}\n\nPregunta del paciente: ${messageText}`;

      // Call AI via process-job pipeline — use image_analysis when images are attached
      const hasImages = sentImages.length > 0;
      const aiResult = hasImages
        ? await runAIJob('image_analysis', {
            userPrompt: fullPrompt,
            imageBase64: sentImages.map((img) => normalizeBase64(img)).join(','),
            mimeType: sentImages.map((img) => inferMimeType(img, 'image/jpeg')).join(','),
            context: {
              patientData: inputContext,
              contextSummary: contextStr,
            },
          })
        : await runAIJob('text_generation', {
            userPrompt: fullPrompt,
            context: {
              patientData: inputContext,
              contextSummary: contextStr,
            },
          });

      let assistantText: string;
      if (aiResult.success && aiResult.result) {
        assistantText = aiResult.result;
        try {
          const parsed = JSON.parse(assistantText);
          if (parsed.hallazgos || parsed.recomendaciones) {
            assistantText = `${parsed.hallazgos || ''}\n\n${parsed.recomendaciones || ''}`;
          }
        } catch {
          // Not JSON — use raw text
        }
      } else {
        assistantText = aiResult.error || 'Error de conexión con Physi.';
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: assistantText,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      speak(assistantText);

      // Save assistant message
      await supabase.from('ai_conversations').insert({
        user_id: user?.id,
        role: 'assistant',
        content: assistantText,
      });
    } catch {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: 'Error de conexión. Intenta de nuevo.' }]);
      toast.error('Error de conexión con Physi');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Analiza mis últimos movimientos',
    'Sugiere ejercicios para mi recuperación',
    '¿Cuál es mi porcentaje de mejora?',
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-x-hidden min-h-0 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <MascotAnimation type="greeting" size="sm" className="breathe-blue" />
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile gradient-text-blue">Physi</h1>
            <p className="text-sm text-on-surface-variant">Tu asistente de fisioterapia</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-breathe-icon" />
          <span className="text-xs font-bold text-green-600">ACTIVO</span>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="glass-panel rounded-3xl p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 pb-4 card-glow-hover relative accent-blue section-bg-blue min-h-0">
        <div className="blob-teal absolute -top-10 -right-10 w-40 h-40 opacity-50 pointer-events-none" />
        <div className="blob-blue absolute bottom-0 -left-10 w-32 h-32 opacity-40 pointer-events-none" />
        {messages.length === 0 && !loading && (
          <div className="empty-state-premium">
            <Icon name="chat_bubble_outline" size={32} className="opacity-40 mb-2" />
            <p className="text-sm text-on-surface-variant">Aún no has iniciado ninguna conversación. Estoy aquí para acompañarte en tu recuperación — escribe tu primera pregunta cuando estés listo.</p>
          </div>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'flex gap-2 items-start'}`}>
              {msg.role === 'assistant' && (
                <MascotAnimation
                  type={loading && msg.id === messages[messages.length - 1]?.id ? 'speaking' : 'idle'}
                  size="xs"
                  className="breathe-blue"
                />
              )}
              <div>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-24 h-24 rounded-xl object-cover" />
                    ))}
                  </div>
                )}
                <div className={`p-4 rounded-2xl text-sm hover-lift whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'chat-bubble-user text-on-surface rounded-tr-none'
                    : 'chat-bubble-physi text-on-surface rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-start">
              <MascotAnimation type="loading" size="xs" className="breathe-blue" />
              <div className="chat-bubble-physi p-4 rounded-2xl rounded-tl-none">
                <div className="chat-typing-dots text-primary flex gap-1">
                  <span /><span /><span />
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                  ))}
                </div>
                <LoadingText context="ai" className="mt-2 block text-xs text-on-surface-variant" />
              </div>
            </div>
          </div>
        )}
        {loading && messages.length === 0 && <SkeletonList count={3} />}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 shrink-0 min-h-0">
          {suggestions.map((s, i) => (
            <motion.button
              key={s}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInput(s)}
              className="px-4 py-2 rounded-full glass-teal text-sm font-medium hover:scale-105 transition-all"
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Image preview */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0 min-h-0">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 items-end shrink-0 pb-2 min-h-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-12 h-12 rounded-xl glass-teal flex items-center justify-center hover:scale-105 transition-all shrink-0"
        >
          <Icon name="image" size={24} className="text-primary" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={toggleRecording}
          type="button"
          aria-label={isRecording ? 'Detener grabación' : 'Grabar voz'}
          className={`relative w-12 h-12 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
            isRecording
              ? 'bg-error/10 border-error/40'
              : 'glass-teal hover:scale-105'
          }`}
        >
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={24}
            className={isRecording ? 'text-error' : 'text-primary'}
          />
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error" />
            </span>
          )}
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Escribe tu mensaje a Physi..."
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl glass-teal outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Enviar consulta"
          className="premium-btn w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          <Icon name="send" size={24} />
        </button>
      </div>
    </div>
  );
}
