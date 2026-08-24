import { useEffect, useRef, useState } from 'react';

export type LoadingContext = 'ocr' | 'pdf' | 'ar' | 'general' | 'ai' | 'auth';

const messages: Record<LoadingContext, string[]> = {
  ocr: [
    'Analizando la imagen con IA…',
    'Extrayendo información relevante…',
    'Reconociendo patrones clínicos…',
    'Procesando documento médico…',
    'Identificando texto…',
  ],
  pdf: [
    'Generando informe profesional…',
    'Estilizando documento…',
    'Compilando datos del paciente…',
    'Preparando reporte clínico…',
    'Dando formato final…',
  ],
  ar: [
    'Calibrando cámara…',
    'Ajustando detección de movimiento…',
    'Inicializando sensores AR…',
    'Sincronizando puntos de referencia…',
    'Optimizando precisión…',
  ],
  ai: [
    'Physi está pensando…',
    'Analizando tu consulta…',
    'Consultando base de conocimientos…',
    'Preparando la mejor respuesta…',
    'Procesando con IA…',
  ],
  general: [
    'Conectando con el servidor seguro…',
    'Preparando tu experiencia…',
    'Cargando datos…',
    'Sincronizando información…',
    'Casi listo…',
  ],
  auth: [
    'Verificando credenciales…',
    'Conectando de forma segura…',
    'Validando acceso…',
    'Autenticando…',
    'Preparando tu sesión…',
  ],
};

function pickRandom(pool: string[], exclude?: string): string {
  if (pool.length === 1) return pool[0];
  let next = exclude;
  let attempts = 0;
  while (next === exclude && attempts < 10) {
    next = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  }
  return next ?? pool[0];
}

/**
 * Returns a rotating motivational loading message for the given context.
 * A new random message is shown every 2–3 seconds (jittered per tick so
 * the rotation feels natural rather than mechanical).
 */
export function useLoadingMessages(context: LoadingContext = 'general', intervalMs = 2500) {
  const pool = messages[context] ?? messages.general;
  const [message, setMessage] = useState(() => pickRandom(pool));
  const lastRef = useRef<string>(message);

  useEffect(() => {
    // Reset immediately when context changes so the first message is relevant.
    const initial = pickRandom(pool, lastRef.current);
    setMessage(initial);
    lastRef.current = initial;

    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      // Jitter between 2s and 3s for a natural feel.
      const delay = 2000 + Math.floor(Math.random() * 1000);
      timer = setTimeout(() => {
        const next = pickRandom(pool, lastRef.current);
        setMessage(next);
        lastRef.current = next;
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // intervalMs is accepted for backwards compatibility but the rotation
  // is jittered automatically; including it in deps would reset the chain.
  void intervalMs;

  return message;
}
