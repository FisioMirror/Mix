import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, RotateCcw } from 'lucide-react';
import { PHYSI_FAQS, type FAQ } from '../../data/physiFAQs';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const WELCOME =
  '¡Hola! Soy Physi, tu guía rápida de FisioMirror. Selecciona una sugerencia o escribe tu consulta y te ayudaré al instante.';

const NO_MATCH =
  'No he entendido tu pregunta. Prueba con términos como **paciente**, **rutina**, **AR** o contacta a soporte: **fisioMirror@proton.me**';

/** Preguntas frecuentes según la ruta actual */
function getFAQs(pathname: string): string[] {
  if (pathname.includes('dashboard')) {
    return ['¿Cómo veo mis pacientes activos?', '¿Qué significa cada color en el dashboard?'];
  }
  if (pathname.includes('exercise')) {
    return ['¿Cómo creo una rutina de ejercicios?', '¿Cómo asigno ejercicios a un paciente?'];
  }
  if (pathname.includes('setting')) {
    return ['¿Cómo cambio mi contraseña?', '¿Cómo activo el modo oscuro?'];
  }
  if (pathname.includes('assistant')) {
    return ['¿Cómo uso las herramientas de IA?', '¿Cómo uso el chatbot Physi?'];
  }
  if (pathname.includes('mirror')) {
    return ['¿Cómo uso el modo espejo AR?', '¿Qué hago si la cámara no funciona?'];
  }
  return ['¿Qué puedo hacer en FisioMirror?', '¿Cómo contacto a soporte?'];
}

// ---------------------------------------------------------------------------
// Matcher offline — puntúa FAQs por coincidencia de palabras clave.
// ---------------------------------------------------------------------------

/** Quita acentos y pasa a minúsculas para comparar de forma tolerante. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // separa y elimina diacríticos
    .trim();
}

/**
 * Busca el FAQ que mejor encaja con el texto del usuario.
 * Cuenta cuántas palabras clave aparecen en el texto y devuelve el de mayor
 * puntuación. Si hay empate, gana el primero. Si ninguna coincide (score 0)
 * devuelve null para que el llamador muestre el mensaje por defecto.
 */
function matchFAQ(input: string): FAQ | null {
  const normalized = normalize(input);
  if (!normalized) return null;

  // Tokens del usuario para coincidencia por palabra completa.
  const tokens = new Set(normalized.split(/\s+/).filter((t) => t.length > 1));

  let best: FAQ | null = null;
  let bestScore = 0;

  for (const faq of PHYSI_FAQS) {
    let score = 0;
    for (const kw of faq.keywords) {
      const nkw = normalize(kw);
      if (!nkw) continue;
      // Coincidencia de frase completa (ej: "modo espejo")
      if (normalized.includes(nkw)) {
        score += nkw.includes(' ') ? 3 : 2;
        continue;
      }
      // Coincidencia por palabra completa para keywords de una sola palabra
      if (!nkw.includes(' ') && tokens.has(nkw)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore > 0 ? best : null;
}

// ---------------------------------------------------------------------------
// Formato de texto — convierte la respuesta (markdown básico) en React.
// ---------------------------------------------------------------------------

/** Renderiza **negritas** inline */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Renderiza texto con formato markdown básico (bullet points, encabezados, negritas) */
function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={key} className="space-y-1.5">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${i}`);
      return;
    }
    const isBullet = /^[-•*]\s/.test(trimmed);
    const isNumbered = /^\d+[.)]\s/.test(trimmed);
    const isHeader = /^#{1,3}\s/.test(trimmed);

    if (isBullet || isNumbered) {
      const content = trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '');
      listItems.push(
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{renderInline(content)}</span>
        </li>,
      );
    } else if (isHeader) {
      flushList(`list-${i}`);
      const level = (trimmed.match(/^#+/) ?? ['#'])[0].length;
      const content = trimmed.replace(/^#+\s/, '');
      blocks.push(
        <p
          key={i}
          className={`font-bold text-primary ${level <= 1 ? 'text-base' : 'text-sm'}`}
        >
          {renderInline(content)}
        </p>,
      );
    } else {
      flushList(`list-${i}`);
      blocks.push(
        <p key={i} className="text-sm leading-relaxed">
          {renderInline(trimmed)}
        </p>,
      );
    }
  });
  flushList('list-final');
  return <div className="space-y-2">{blocks}</div>;
}

// ---------------------------------------------------------------------------
// Componente principal — burbuja flotante de chat
// ---------------------------------------------------------------------------

interface PhysiGuideProps {
  className?: string;
  controlledOpen?: boolean;
  onControlledClose?: () => void;
}

export function PhysiGuide({ className, controlledOpen, onControlledClose }: PhysiGuideProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen !== undefined) {
      if (!v && onControlledClose) onControlledClose();
    } else {
      setInternalOpen(v);
    }
  };
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const faqs = getFAQs(location.pathname);
  const showFAQs = messages.length <= 1 && !loading;

  // Auto-scroll al final del chat
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Enfocar el textarea al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-resize del textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
  }, [input]);

  // Respuesta offline: busca el mejor FAQ sin llamar a ningún servicio.
  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Pequeña pausa para que el indicador de escritura sea visible y natural.
    setTimeout(() => {
      const match = matchFAQ(trimmed);
      const replyText = match ? match.answer : NO_MATCH;
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: replyText },
      ]);
      setLoading(false);
    }, 450);
  }, [loading]);

  const handleSend = () => sendMessage(input);

  const resetChat = () => {
    setMessages([{ id: 'welcome', role: 'assistant', text: WELCOME }]);
    setInput('');
  };

  const controlled = controlledOpen !== undefined;

  return (
    <div className={className}>
      {/* Botón flotante — esquina inferior izquierda (no choca con FloatingMenu, que está a la derecha) */}
      {!controlled && (
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        aria-label={open ? 'Cerrar guía de Physi' : 'Abrir guía de Physi'}
        aria-expanded={open}
        className="fixed bottom-24 left-4 lg:bottom-8 lg:left-8 z-[120] flex items-center justify-center w-14 h-14 rounded-full min-h-[56px] min-w-[56px] touch-manipulation active:scale-95 pb-[env(safe-area-inset-bottom)] relative group"
      >
        {/* Anillo pulsante */}
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {/* Cuerpo del botón con gradiente */}
        <motion.span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-primary/30"
          animate={{ scale: open ? 0.95 : 1 }}
        />
        {/* Badge "IA" */}
        {!open && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md z-10">
            IA
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center relative z-10 text-white"
        >
          {open ? <X size={24} /> : <Bot size={28} />}
        </motion.div>
      </motion.button>
      )}

      {/* Ventana flotante de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-40 left-4 right-4 sm:right-auto sm:left-4 sm:w-80 lg:left-8 lg:bottom-28 z-[106] w-[calc(100vw-2rem)] max-h-[55vh] flex flex-col glass-panel rounded-3xl border divider-teal shadow-2xl overflow-hidden"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 border-b divider-teal shrink-0 bg-primary/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Bot size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-on-surface truncate">
                    Physi - Guía Rápida
                  </h3>
                  <p className="text-[11px] text-outline truncate">
                    Guía rápida de FisioMirror
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={resetChat}
                  aria-label="Nueva consulta"
                  className="text-outline hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar guía"
                  className="text-outline hover:text-error transition-colors p-2 rounded-lg hover:bg-error/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin"
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        msg.role === 'user'
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <span className="text-[10px] font-bold">Tú</span>
                      ) : (
                        <Bot size={14} />
                      )}
                    </div>

                    {/* Burbuja */}
                    <div
                      className={`p-2.5 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'chat-bubble-user text-on-surface rounded-tr-sm'
                          : 'chat-bubble-physi text-on-surface rounded-tl-sm'
                      }`}
                    >
                      {msg.role === 'assistant' ? renderMarkdown(msg.text) : msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Indicador de escritura */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-primary" />
                    </div>
                    <div className="chat-bubble-physi p-2.5 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1.5 items-center">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.4, 1, 0.4],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.18,
                            }}
                            className="w-2 h-2 bg-primary rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sugerencias frecuentes según la ruta */}
            {showFAQs && (
              <div className="px-3 pb-2 shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  Sugerencias
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-thin">
                  {faqs.map((faq, i) => (
                    <motion.button
                      key={faq}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendMessage(faq)}
                      className="px-2.5 py-1.5 rounded-full glass-teal text-xs font-medium hover:scale-105 transition-all text-primary"
                    >
                      {faq}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Entrada de texto */}
            <div className="p-3 border-t divider-teal shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribe tu consulta..."
                  rows={1}
                  className="flex-1 px-3 py-2.5 rounded-xl glass-teal outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm max-h-24"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  aria-label="Enviar consulta"
                  className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
