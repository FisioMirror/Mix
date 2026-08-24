import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ChatMessage {
  id?: string | number;
  /** Texto del mensaje. */
  text: string;
  /** Quién lo envía. */
  sender: 'user' | 'assistant';
}

interface ChatMessagesProps {
  /** Mensajes a mostrar. */
  messages: ChatMessage[];
  /** Reproduce automáticamente la conversación al montar. */
  autoPlay?: boolean;
  /** Retardo entre mensajes en ms. */
  autoPlayDelay?: number;
  /** Duración del indicador de "escribiendo…" en ms. */
  typingDuration?: number;
  /** Muestra el botón de repetición. */
  showReplay?: boolean;
  /** Modo interactivo: el usuario puede escribir y enviar mensajes. */
  interactive?: boolean;
  className?: string;
  /** Callback al enviar un mensaje en modo interactivo. */
  onSend?: (text: string) => void;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  { id: 1, text: '¡Hola! Soy Physi, tu asistente de fisioterapia 💪', sender: 'assistant' },
  { id: 2, text: '¿Qué puedo hacer por ti hoy?', sender: 'assistant' },
  { id: 3, text: 'Tengo dolor en el hombro derecho al levantar el brazo', sender: 'user' },
  {
    id: 4,
    text: 'Entiendo. Vamos a valorarlo juntos. ¿Podrías describir cuándo empezó el dolor?',
    sender: 'assistant',
  },
  { id: 5, text: 'Empezó hace tres días, después de entrenar', sender: 'user' },
  {
    id: 6,
    text: 'Perfecto, te prepararé una rutina de movilidad suave para el hombro 🧘',
    sender: 'assistant',
  },
];

export function ChatMessages({
  messages = DEFAULT_MESSAGES,
  autoPlay = true,
  autoPlayDelay = 1200,
  typingDuration = 1500,
  showReplay = true,
  interactive = false,
  className,
  onSend,
}: ChatMessagesProps) {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  /** Reproduce la secuencia de mensajes desde cero. */
  const replay = useCallback(() => {
    clearTimers();
    setVisibleMessages([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setIsTyping(false);

    if (!autoPlay) {
      setVisibleMessages(messages);
      setIsComplete(true);
      return;
    }

    // Primer paso tras un pequeño retardo.
    addTimer(() => {
      setCurrentIndex(0);
    }, 100);
  }, [autoPlay, clearTimers, addTimer, messages]);

  // Lógica de auto-play controlada por el índice actual.
  useEffect(() => {
    if (!autoPlay || isComplete || currentIndex >= messages.length) {
      if (currentIndex >= messages.length && !isComplete) {
        setIsComplete(true);
        setIsTyping(false);
      }
      return;
    }

    const message = messages[currentIndex];
    const isAssistant = message.sender === 'assistant';

    // El asistente "escribe" antes de mostrar el mensaje.
    const typingDelay = isAssistant ? typingDuration : autoPlayDelay * 0.4;

    setIsTyping(isAssistant);

    addTimer(() => {
      setIsTyping(false);
      setVisibleMessages((prev) => [...prev, { ...message, id: message.id ?? prev.length }]);
      addTimer(() => {
        setCurrentIndex((prev) => prev + 1);
      }, autoPlayDelay);
    }, typingDelay);
  }, [currentIndex, autoPlay, isComplete, messages, typingDuration, autoPlayDelay, addTimer]);

  // Arranque inicial.
  useEffect(() => {
    if (!autoPlay) {
      setVisibleMessages(messages);
      setIsComplete(true);
      return;
    }
    replay();
    return clearTimers;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll al final.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [visibleMessages, isTyping]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: Date.now(), text, sender: 'user' };
    setVisibleMessages((prev) => [...prev, userMessage]);
    setInput('');
    onSend?.(text);
  }, [input, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-surface/60 backdrop-blur-sm',
        'w-full max-w-md overflow-hidden shadow-sm',
        className,
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <span className="text-sm font-semibold">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-on-surface">Physi</span>
            <span className="text-xs text-on-surface-variant">
              {isTyping ? 'escribiendo…' : 'asistente virtual'}
            </span>
          </div>
        </div>

        {showReplay && (
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface"
            aria-label="Repetir conversación"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Repetir
          </button>
        )}
      </div>

      {/* Cuerpo del chat */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        style={{ minHeight: 320, maxHeight: 420 }}
      >
        <AnimatePresence initial={false}>
          {visibleMessages.map((message, i) => {
            const isUser = message.sender === 'user';
            return (
              <motion.div
                key={message.id ?? i}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                    isUser
                      ? 'rounded-br-md bg-primary text-white'
                      : 'rounded-bl-md bg-surface-variant/60 text-on-surface',
                  )}
                >
                  {message.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Indicador de escritura */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface-variant/60 px-4 py-3 shadow-sm">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/60"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: dot * 0.15,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Entrada interactiva */}
      {interactive && (
        <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje…"
            className="flex-1 rounded-xl bg-surface-variant/30 px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatMessages;
