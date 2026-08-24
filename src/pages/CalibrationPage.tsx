import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/ToastProvider';
import { usePoseDetection } from '../hooks/usePoseDetection';

type CalibState = 'idle' | 'detecting' | 'calibrating' | 'success' | 'error';

const STORAGE_KEY = 'calibrationCompleted';
const SKIP_KEY = 'calibrationSkipped';
const DETECT_TIMEOUT = 15;
const COUNTDOWN_FROM = 3;

export function CalibrationPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { videoRef, canvasRef, poseData, isReady, error, startCamera } = usePoseDetection();
  const vRef = videoRef as React.RefObject<HTMLVideoElement>;
  const cRef = canvasRef as React.RefObject<HTMLCanvasElement>;

  const [state, setState] = useState<CalibState>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [detectElapsed, setDetectElapsed] = useState(0);

  const detectStartRef = useRef<number>(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (isReady && !error && state === 'idle') {
      setState('detecting');
      detectStartRef.current = Date.now();
      setDetectElapsed(0);
    }
  }, [isReady, error, state]);

  useEffect(() => {
    if (state !== 'detecting') return;
    if (poseData?.isTracking) {
      setState('calibrating');
    }
  }, [poseData, state]);

  useEffect(() => {
    if (state !== 'detecting') return;
    errorTimerRef.current = setTimeout(() => {
      setState((s) => (s === 'detecting' ? 'error' : s));
    }, DETECT_TIMEOUT * 1000);
    elapsedTimerRef.current = setInterval(() => {
      setDetectElapsed(Math.floor((Date.now() - detectStartRef.current) / 1000));
    }, 1000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      errorTimerRef.current = null;
      elapsedTimerRef.current = null;
    };
  }, [state]);

  useEffect(() => {
    if (state !== 'calibrating') return;
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    const lm = poseData?.landmarks;
    if (!lm) return;
    const rightWrist = lm[16];
    const rightShoulder = lm[12];
    const leftWrist = lm[15];
    const leftShoulder = lm[11];
    if (!rightWrist || !rightShoulder || !leftWrist || !leftShoulder) return;
    const handRaised = rightWrist.y < rightShoulder.y || leftWrist.y < leftShoulder.y;
    if (!handRaised) return;

    let n = COUNTDOWN_FROM;
    setCountdown(n);
    countdownTimerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
          localStorage.removeItem(SKIP_KEY);
        } catch { /* */ }
        toast.success('Calibracion completada correctamente');
        setState('success');
      } else {
        setCountdown(n);
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    };
  }, [state, poseData, toast]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const goAR = () => navigate('/ar-mirror');

  const handleSkip = () => {
    try {
      localStorage.setItem(SKIP_KEY, 'true');
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* */ }
    setShowSkipConfirm(false);
    goAR();
  };

  const retry = () => {
    setCountdown(COUNTDOWN_FROM);
    setDetectElapsed(0);
    setState('detecting');
    detectStartRef.current = Date.now();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col overflow-hidden">
      <video ref={vRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted style={{ zIndex: 1 }} />
      <canvas ref={cRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" style={{ zIndex: 2 }} />

      <header className="relative z-30 flex items-center justify-between px-5 py-4" style={{ background: 'rgba(13,27,26,0.6)', backdropFilter: 'blur(20px)' }}>
        <button
          onClick={() => navigate('/dashboard-paciente')}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Volver"
        >
          <Icon name="arrow_back" size={20} className="text-white" />
        </button>
        <h1 className="font-bold text-lg">Calibracion de Camara</h1>
        <span className="text-xs font-bold bg-teal-500/20 text-teal-300 px-3 py-1.5 rounded-full">SESION AR</span>
      </header>

      <button
        onClick={() => setShowSkipConfirm(true)}
        className="absolute bottom-6 left-6 z-30 px-5 py-3 rounded-2xl bg-white/10 text-white font-bold flex items-center gap-2 hover:bg-white/20 transition-colors"
        style={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', minHeight: '44px' }}
        aria-label="Omitir calibracion"
      >
        <Icon name="skip_next" size={22} /> Omitir
      </button>

      {state === 'idle' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900 gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-white/70 text-sm">Inicializando camara...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900 gap-4 p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <Icon name="videocam_off" filled size={40} className="text-red-400" />
          </div>
          <p className="text-red-300 text-sm max-w-sm">{error}</p>
          <button onClick={() => navigate('/dashboard-paciente')} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors">Volver</button>
        </div>
      )}

      {state === 'detecting' && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none gap-6">
          <motion.div animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="w-32 h-32 rounded-full border-4 border-teal-400" />
          <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} className="absolute w-32 h-32 rounded-full border-2 border-cyan-400" />
          <p className="text-white text-xl font-bold text-center drop-shadow-lg">Colocate frente a la camara</p>
          <p className="text-white/70 text-sm">Asegurate de que tu cuerpo sea visible</p>
          <div className="mt-2 px-4 py-2 rounded-full" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)' }}>
            <span className="text-white/60 text-xs">Tiempo: {detectElapsed}s / {DETECT_TIMEOUT}s</span>
          </div>
        </div>
      )}

      {state === 'calibrating' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none gap-4">
          <AnimatePresence mode="wait">
            {countdown > 0 ? (
              <motion.div key={countdown} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="text-9xl font-black text-teal-400 drop-shadow-2xl">
                {countdown}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="rounded-2xl px-5 py-3" style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-white font-bold text-center">Levanta tu mano por encima del hombro!</p>
            <p className="text-white/60 text-sm text-center mt-1">Manten la posicion durante la cuenta atras</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {state === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md gap-6 p-6 text-center">
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-28 h-28 rounded-full bg-teal-500 flex items-center justify-center shadow-xl shadow-teal-500/40">
              <Icon name="check" size={64} className="text-white" />
            </motion.div>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <h2 className="text-3xl font-bold text-white mb-2">Calibracion exitosa!</h2>
              <p className="text-white/70">Tu camara esta lista para el modo AR</p>
            </motion.div>
            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} onClick={goAR} className="mt-4 px-8 py-4 bg-teal-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-teal-500/30">
              <Icon name="play_arrow" size={22} /> Continuar al Modo AR
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-md gap-5 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Icon name="warning" filled size={40} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">No se detecto tu cuerpo</h2>
            <p className="text-white/70 max-w-sm">Asegurate de tener buena iluminacion y de estar frente a la camara con tu cuerpo visible.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button onClick={retry} className="px-6 py-3 bg-teal-500 text-white rounded-xl font-bold flex items-center gap-2 justify-center hover:scale-105 active:scale-95 transition-transform">
                <Icon name="refresh" size={20} /> Reintentar
              </button>
              <button onClick={() => setShowSkipConfirm(true)} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold flex items-center gap-2 justify-center hover:bg-white/20 transition-colors">
                Omitir calibracion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isReady && !error && state !== 'idle' && state !== 'success' && (
        <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full" style={{ backdropFilter: 'blur(8px)' }}>
          <span className={`w-2.5 h-2.5 rounded-full ${poseData?.isTracking ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-white text-xs font-bold uppercase tracking-wider">{poseData?.isTracking ? 'Cuerpo detectado' : 'Buscando...'}</span>
        </div>
      )}

      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setShowSkipConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="rounded-3xl p-6 max-w-md w-full text-center border border-white/10" style={{ background: 'rgba(22,35,34,0.95)', backdropFilter: 'blur(24px)' }}>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Icon name="warning" filled size={32} className="text-amber-400" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Continuar sin calibrar?</h3>
              <p className="text-white/70 text-sm mb-6">La precision del seguimiento puede verse afectada sin calibrar. Deseas continuar?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSkipConfirm(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors">Cancelar</button>
                <button onClick={handleSkip} className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform">Continuar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
