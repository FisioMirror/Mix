import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/ToastProvider';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { celebrateSession } from '../lib/confetti';
import { usePoseDetection } from '../hooks/usePoseDetection';

// Rep completion particle burst
function repParticleBurst() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = (canvas as HTMLCanvasElement).getContext('2d');
  if (!ctx) return;
  const c = canvas as HTMLCanvasElement;
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  const particles: Array<{x:number;y:number;vx:number;vy:number;life:number;color:string}> = [];
  const colors = ['#22c55e', '#06B6D4', '#0D9488', '#eab308'];
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24;
    const speed = 3 + Math.random() * 4;
    particles.push({
      x: c.width / 2,
      y: c.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.02;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (alive && frame < 80) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, c.width, c.height);
  };
  animate();
}
import { AnimatedCountdown } from '../components/ui/AnimatedCountdown';
import { TypewriterText } from '../components/ui/TypewriterText';
import MascotAnimation from '../components/ui/MascotAnimation';

type SessionState = 'active' | 'paused' | 'rest' | 'finished';

const TARGET_REPS = 15;
const TOTAL_SETS = 3;
const REST_DURATION = 15;

export function ARMirrorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const exerciseName = searchParams.get('ejercicio') || 'Sesión AR';

  const { videoRef, canvasRef, poseData, isReady, error, repCount, resetReps, startCamera, cameraStarted, setTargetAngle } = usePoseDetection();
  const vRef = videoRef as React.RefObject<HTMLVideoElement>;
  const cRef = canvasRef as React.RefObject<HTMLCanvasElement>;

  const [state, setState] = useState<SessionState>('active');
  const [timer, setTimer] = useState(0);
  const [bpm] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restCountdown, setRestCountdown] = useState(REST_DURATION);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [qualityScore, setQualityScore] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compensation, setCompensation] = useState<string | null>(null);
  const [showPainReport, setShowPainReport] = useState(false);
  const [painBefore, setPainBefore] = useState(0);
  const [painAfter, setPainAfter] = useState(0);
  const [fatigueLevel, setFatigueLevel] = useState(3);
  const [painComment, setPainComment] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [calibrated, setCalibrated] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<'high' | 'low' | 'muted'>('high');
  const [hudVisible, setHudVisible] = useState(true);
  const [hudMode, setHudMode] = useState<'full' | 'minimal' | 'camera'>('full');
  const aiFeedbackRef = useRef<string>('Buen ritmo. Mantén la postura erguida y completa el rango de movimiento.');
  const lastSpokenRef = useRef<number>(0);

  const speak = (text: string) => {
    if (volumeLevel === 'muted') return;
    const now = Date.now();
    if (now - lastSpokenRef.current < 3000) return;
    lastSpokenRef.current = now;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = volumeLevel === 'low' ? 0.9 : 1.1;
      utterance.volume = volumeLevel === 'low' ? 0.4 : 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis not available
    }
  };

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (state === 'active') setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  // Set default target angle for exoskeleton color coding
  useEffect(() => {
    setTargetAngle(90); // Default 90° target; could be fetched from exercise config
  }, []);

  // Read calibration state from localStorage (set by CalibrationPage).
  useEffect(() => {
    try {
      setCalibrated(localStorage.getItem('calibrationCompleted') === 'true');
    } catch {
      setCalibrated(false);
    }
  }, []);

  // Start the camera automatically on mount so pose detection begins.
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Mark session as started once the camera is live
  useEffect(() => {
    if (cameraStarted) setSessionStarted(true);
  }, [cameraStarted]);

  // Quality score from pose data + compensation detection
  useEffect(() => {
    if (poseData?.isTracking && poseData.landmarks) {
      setQualityScore(poseData.postureScore);

      // Compensation detection: check hip and torso alignment
      const leftHip = poseData.landmarks[23];
      const rightHip = poseData.landmarks[24];
      const leftShoulder = poseData.landmarks[11];
      const rightShoulder = poseData.landmarks[12];

      let detectedCompensation: string | null = null;

      if (leftHip && rightHip && leftShoulder && rightShoulder) {
        const hipTilt = Math.abs(leftHip.y - rightHip.y);
        const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
        const torsoLean = Math.abs(((leftShoulder.x + rightShoulder.x) / 2) - ((leftHip.x + rightHip.x) / 2));

        if (hipTilt > 0.08) {
          detectedCompensation = 'Compensación detectada: cadera desalineada. Nivela las caderas.';
          speak('Nivela las caderas');
        } else if (shoulderTilt > 0.08) {
          detectedCompensation = 'Compensación detectada: hombros desalineados. Mantén los hombros nivelados.';
          speak('Mantén los hombros nivelados');
        } else if (torsoLean > 0.15) {
          detectedCompensation = 'Compensación detectada: torso inclinado. Mantén el torso erguido.';
          speak('Mantén el torso erguido');
        }
      }

      setCompensation(detectedCompensation);

      if (!detectedCompensation) {
        if (poseData.postureScore > 80) {
          aiFeedbackRef.current = 'Excelente postura. Mantén la alineación corporal.';
        } else if (poseData.postureScore > 50) {
          aiFeedbackRef.current = 'Buen esfuerzo. Intenta extender más los brazos para mejor detección.';
        } else {
          aiFeedbackRef.current = 'No detecto tu cuerpo claramente. Asegúrate de estar a 2 metros de la cámara.';
        }
      } else {
        aiFeedbackRef.current = detectedCompensation;
      }
    }
  }, [poseData, volumeLevel]);

  // Rep completion → rest or finish
  useEffect(() => {
    if (state !== 'active') return;
    if (repCount >= TARGET_REPS) {
      if (currentSet < TOTAL_SETS) {
        setState('rest');
        setRestCountdown(REST_DURATION);
        toast.success(`Serie ${currentSet} completada!`);
        repParticleBurst();
        speak('Serie completada. Descansa.');
      } else {
        setState('finished');
        setShowPainReport(true);
        celebrateSession();
        repParticleBurst();
        speak('Sesión completada. Excelente trabajo.');
      }
    }
  }, [repCount, state, currentSet, volumeLevel]);

  // Rest countdown
  useEffect(() => {
    if (state === 'rest' && restCountdown > 0) {
      const t = setTimeout(() => setRestCountdown(restCountdown - 1), 1000);
      return () => clearTimeout(t);
    }
    if (state === 'rest' && restCountdown === 0) {
      setCurrentSet((s) => s + 1);
      setState('active');
      resetReps();
      toast.info('Serie reanudada');
      speak('Comienza la siguiente serie.');
    }
  }, [state, restCountdown, resetReps]);

  const saveSession = async (reportData?: { dolor_antes: number; dolor_despues: number; fatiga: number; comentario: string }) => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem('ar_session_backup', JSON.stringify({
        exerciseName, timer, repCount, qualityScore, currentSet,
      }));

      const ejerciciosData = [{
        nombre: exerciseName,
        series: currentSet,
        repeticiones: repCount,
        duracion_segundos: timer,
        calidad_promedio: qualityScore,
      }];

      // Calculate adherence: completed reps vs target reps (TARGET_REPS * TOTAL_SETS)
      const targetTotal = TARGET_REPS * TOTAL_SETS;
      const adherencia = targetTotal > 0 ? Math.min(100, Math.round((repCount * currentSet / targetTotal) * 100)) : 0;

      const { data: sessionData, error: sessionError } = await supabase.from('sesiones_completadas').insert({
        paciente_id: user.id,
        ejercicio_nombre: exerciseName,
        duracion_segundos: timer,
        repeticiones: repCount,
        calidad_ejecucion: qualityScore,
        calidad_promedio: qualityScore,
        ejercicios: ejerciciosData,
        adherencia: adherencia,
        notas: aiFeedbackRef.current,
        compensaciones_detectadas: compensation ? { tipo: compensation } : null,
        dolor_reportado: reportData?.dolor_despues ?? null,
      }).select('id').single();

      if (sessionError) throw sessionError;

      if (reportData && sessionData?.id) {
        const { error: reportError } = await supabase.from('post_session_reports').insert({
          paciente_id: user.id,
          sesion_id: sessionData.id,
          dolor_antes: reportData.dolor_antes,
          dolor_despues: reportData.dolor_despues,
          fatiga_nivel: reportData.fatiga,
          comentario: reportData.comentario || null,
        });
        if (reportError) console.error('Error saving pain report:', reportError.message);
      }

      toast.success('Sesión guardada correctamente');
      sessionStorage.removeItem('ar_session_backup');
      setShowPainReport(false);
      setShowFinishModal(true);
    } catch (e) {
      console.error('Error saving session:', (e as Error).message);
      toast.error('Error al guardar la sesión: ' + (e as Error).message);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const currentAngle = poseData ? Math.max(poseData.leftElbowAngle, poseData.rightElbowAngle) : 0;
  const angleProgress = 2 * Math.PI * 80 - (currentAngle / 180) * 2 * Math.PI * 80;

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      toast.error('No se pudo cambiar a pantalla completa');
    }
  };

  const handleRestart = () => {
    setState('active');
    resetReps();
    setCurrentSet(1);
    setTimer(0);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#001514] flex flex-col overflow-hidden">
      {/* Particle canvas for rep completion bursts */}
      <canvas id="particle-canvas" className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }} />

      {/* Video as real background + canvas overlay on top */}
      <video ref={vRef} className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 1, filter: 'brightness(0.75) contrast(1.15)' }} muted playsInline autoPlay />
      <canvas
        ref={cRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 2 }}
      />

      {/* HUD visibility toggle — floating eye button */}
      {sessionStarted && !error && (
        <button
          onClick={() => { setHudVisible(!hudVisible); setHudMode(hudMode === 'full' ? 'minimal' : 'full'); }}
          aria-label={hudVisible ? 'Ocultar panel' : 'Mostrar panel'}
          className="glass-panel rounded-full p-3 text-white hover:scale-110 active:scale-95 transition-all fixed top-4 right-4 z-[35]"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <Icon name={hudVisible ? 'visibility_off' : 'visibility'} size={22} />
        </button>
      )}

      {/* Camera loading / scanning state — escaneando.webp durante calibración AR */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <MascotAnimation type="scanning" size="md" />
          <p className="text-white/60 text-sm">Inicializando cámara y MediaPipe...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <MascotAnimation type="error" size="md" />
          <p className="text-white/80 text-center max-w-sm">{error}</p>
          <button onClick={() => navigate('/dashboard-paciente')} className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all">
            Volver
          </button>
        </div>
      )}

      {/* Pre-session instruction overlay (before camera activation) */}
      {!sessionStarted && !error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <MascotAnimation type="greeting" size="md" />
          <TypewriterText
            text="Ajusta tu postura frente a la cámara..."
            className="text-white text-lg md:text-xl font-medium max-w-md"
          />
          {!calibrated && (
            <div className="mt-2 max-w-md rounded-2xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 text-amber-200 text-sm flex items-center gap-2">
              <Icon name="warning" filled size={18} />
              <span>Modo sin calibrar: la precisión del seguimiento puede ser menor.</span>
            </div>
          )}
        </div>
      )}

      {/* Tracking indicator — hidden when HUD is off */}
      {isReady && !error && hudVisible && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
            <span className={`w-2.5 h-2.5 rounded-full ${poseData?.isTracking ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`} />
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">
              {poseData?.isTracking ? 'Seguimiento Activo' : 'Buscando Postura...'}
            </span>
          </div>
          {/* REC indicator */}
          <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">REC 1080p 60fps</span>
          </div>
        </div>
      )}

      {/* Rest overlay */}
      <AnimatePresence>
        {state === 'rest' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-30"
          >
            <motion.h2
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-white text-4xl font-bold mb-4"
            >
              Descanso
            </motion.h2>
            <motion.span
              key={restCountdown}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black text-white"
            >
              {restCountdown}
            </motion.span>
            <p className="text-white/60 mt-4">Serie {currentSet} completada</p>
            <button onClick={() => setRestCountdown(0)} className="mt-8 px-6 py-3 rounded-full bg-white/20 text-white font-bold hover:bg-white/30 active:scale-95 transition-all">
              Saltar descanso
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD — controlled by hudVisible/hudMode */}
      <div className={`relative z-20 flex flex-col h-full p-4 md:p-8 pointer-events-none transition-opacity duration-300 ${hudMode === 'camera' ? 'opacity-0' : 'opacity-100'}`}>
        {/* Top HUD — hidden in minimal mode */}
        <div className={`flex justify-between items-start mt-12 transition-all duration-300 ${hudMode === 'minimal' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-xl p-2 md:rounded-2xl md:p-4 pointer-events-auto max-w-[90%]"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
                <Icon name="accessibility" filled size={20} className="text-on-primary-container" />
              </div>
              <div>
                <p className="text-white font-bold text-sm md:text-base">{exerciseName}</p>
                <p className="text-white/60 text-xs">Sesión AR con MediaPipe</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <div className="text-center">
              <p className="text-white/60 text-xs">Tiempo</p>
              <p className="text-white font-mono text-base md:text-xl">{formatTime(timer)}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            {/* Animated countdown timer (alternative visual timer) */}
            <div className="text-center">
              <p className="text-white/60 text-xs mb-1">Cuenta atrás</p>
              <AnimatedCountdown initialCount={60} className="scale-75 origin-center" />
            </div>
            <div className="w-px h-8 bg-white/20" />
            {bpm > 0 && (
            <div className="text-center">
              <p className="text-white/60 text-xs">BPM</p>
              <div className="flex items-center gap-1">
                <Icon name="favorite" filled size={16} className="text-red-500 animate-pulse animate-breathe-icon" />
                <span className="text-white font-bold text-base md:text-xl">{bpm}</span>
              </div>
            </div>
            )}
          </motion.div>
        </div>

        {/* Middle HUD — in minimal mode only show rep count */}
        <div className={`flex-1 flex items-center justify-between transition-all duration-300 ${hudMode === 'minimal' ? 'justify-center' : ''}`}>
          {/* Left: Series + Reps — hidden in minimal mode */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`space-y-3 md:space-y-4 ${hudMode === 'minimal' ? 'hidden' : ''}`}
          >
            <div className="glass-panel rounded-2xl p-3 md:p-4 w-44 md:w-56" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Series</p>
              <div className="flex items-baseline gap-2">
                <span className="text-white text-3xl md:text-4xl font-black">{currentSet}</span>
                <span className="text-white/40 text-lg md:text-xl">/ {TOTAL_SETS}</span>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-3 md:p-4 w-44 md:w-56" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Repeticiones</p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={repCount}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-white text-5xl md:text-7xl font-black"
                >
                  {repCount}
                </motion.span>
                <span className="text-white/40 text-lg md:text-xl">/ {TARGET_REPS}</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Angle meter — hidden in minimal mode, but show compact rep counter */}
          {hudMode === 'minimal' ? (
            <div className="glass-panel rounded-2xl px-6 py-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Icon name="visibility" filled size={24} className="text-white/80" />
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider">Reps</p>
                <span className="text-white text-4xl font-black">{repCount}</span>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <button onClick={() => setState('paused')} className="text-white p-2 rounded-xl hover:bg-white/10 transition-colors" aria-label="Pausar">
                <Icon name="pause" size={24} />
              </button>
            </div>
          ) : (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="glass-panel rounded-full w-48 h-48 md:w-64 md:h-64 flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <motion.circle
                  cx="100" cy="100" r="80" fill="none" stroke="#8ad3cf" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={angleProgress}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              <div className="relative z-10 text-center">
                <p className="text-white/60 text-xs uppercase tracking-wider">Ángulo</p>
                <span className="text-white text-3xl md:text-5xl font-black">{currentAngle}°</span>
                <div className="w-12 h-px bg-white/20 my-2 mx-auto" />
                <p className="text-white/60 text-xs">Postura: {qualityScore}%</p>
              </div>
              <Icon name="verified" filled size={20} className="text-[#8ad3cf] absolute top-4 right-4 animate-breathe-icon" style={{ filter: 'drop-shadow(0 0 15px rgba(138,211,207,0.8))' }} />
            </div>
          </motion.div>
          )}
        </div>

        {/* Bottom HUD: AI feedback + controls — AI feedback hidden in minimal mode */}
        <div className="space-y-3 md:space-y-4">
          {hudMode === 'full' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`glass-panel rounded-2xl p-3 md:p-4 border-l-4 flex items-center gap-3 ${compensation ? 'border-l-orange-400' : 'border-l-[#8ad3cf]'}`}
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Icon name={compensation ? 'warning' : 'smart_toy'} filled size={24} className={compensation ? 'text-orange-400 shrink-0' : 'text-[#8ad3cf] shrink-0'} />
            <p className={`text-sm ${compensation ? 'text-orange-300' : 'text-white'}`}>{aiFeedbackRef.current}</p>
          </motion.div>
          )}
          <div className="flex items-center justify-center gap-2 md:gap-4 pointer-events-auto flex-wrap">
            {state === 'active' && (
              <>
                <button onClick={() => setState('paused')} className="glass-panel rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
                  <Icon name="pause" size={24} /> Pausar
                </button>
                <button onClick={() => { setState('finished'); setShowPainReport(true); }} className="bg-red-500/80 backdrop-blur-xl border border-red-400/50 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                  <Icon name="stop" size={24} /> Finalizar
                </button>
                <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} className="glass-panel rounded-2xl p-3 md:p-4 text-white hover:scale-105 active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
                  <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={24} />
                </button>
                <button onClick={() => setShowSettings(true)} aria-label="Abrir configuración" className="glass-panel rounded-2xl p-3 md:p-4 text-white hover:scale-105 active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
                  <Icon name="settings" size={24} />
                </button>
                <button onClick={() => {
                  const states: Array<'high' | 'low' | 'muted'> = ['high', 'low', 'muted'];
                  const idx = states.indexOf(volumeLevel);
                  setVolumeLevel(states[(idx + 1) % 3]);
                }} className="glass-panel rounded-2xl p-3 md:p-4 text-white hover:scale-105 active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }} aria-label="Cambiar volumen">
                  <Icon name={volumeLevel === 'muted' ? 'volume_off' : volumeLevel === 'low' ? 'volume_down' : 'volume_up'} size={24} />
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button onClick={() => setState('active')} className="premium-btn glass-panel rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
                  <Icon name="play_arrow" size={24} /> Reanudar
                </button>
                <button onClick={handleRestart} className="glass-panel rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
                  <Icon name="refresh" size={24} /> Reiniciar
                </button>
                <button onClick={() => { setState('finished'); setShowPainReport(true); }} className="bg-red-500/80 backdrop-blur-xl border border-red-400/50 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                  <Icon name="stop" size={24} /> Abandonar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-modal glass-panel rounded-3xl p-6 max-w-xs w-full mx-4"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <h3 className="text-white text-xl font-bold mb-4">Configuración</h3>
              <div className="space-y-3">
                <button onClick={() => { setVolumeLevel(volumeLevel === 'muted' ? 'high' : 'muted'); }} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 text-white">
                  <span>Audio</span>
                  <Icon name={volumeLevel !== 'muted' ? 'toggle_on' : 'toggle_off'} size={28} className={volumeLevel !== 'muted' ? 'text-green-400' : 'text-white/40'} />
                </button>
                <button onClick={() => { handleRestart(); setShowSettings(false); }} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                  <span>Reiniciar sesión</span>
                  <Icon name="refresh" size={20} />
                </button>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full mt-4 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors">
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pain report modal */}
      <AnimatePresence>
        {showPainReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-modal glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <h2 className="text-white text-2xl font-bold mb-2">Reporte Post-Sesión</h2>
              <p className="text-white/60 text-sm mb-6">Tu fisioterapeuta necesita esta información para ajustar tu rutina.</p>

              <div className="space-y-5">
                <div>
                  <label className="text-white/80 text-sm font-bold">Dolor antes de la sesión (0-10)</label>
                  <input type="range" min={0} max={10} value={painBefore} onChange={(e) => setPainBefore(Number(e.target.value))} className="w-full mt-2 accent-[#8ad3cf]" />
                  <div className="flex justify-between text-white/40 text-xs mt-1"><span>0</span><span className="text-white font-bold text-base">{painBefore}</span><span>10</span></div>
                </div>
                <div>
                  <label className="text-white/80 text-sm font-bold">Dolor después de la sesión (0-10)</label>
                  <input type="range" min={0} max={10} value={painAfter} onChange={(e) => setPainAfter(Number(e.target.value))} className="w-full mt-2 accent-[#8ad3cf]" />
                  <div className="flex justify-between text-white/40 text-xs mt-1"><span>0</span><span className="text-white font-bold text-base">{painAfter}</span><span>10</span></div>
                </div>
                <div>
                  <label className="text-white/80 text-sm font-bold">Nivel de fatiga (1-5)</label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setFatigueLevel(n)} className={`flex-1 py-2 rounded-xl font-bold transition-all ${fatigueLevel === n ? 'bg-[#8ad3cf] text-[#001514]' : 'bg-white/10 text-white/60'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/80 text-sm font-bold">Comentario (opcional)</label>
                  <textarea value={painComment} onChange={(e) => setPainComment(e.target.value)} placeholder="Describe cómo te sentiste durante la sesión..." className="w-full mt-2 p-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/10 focus:border-[#8ad3cf] outline-none resize-none" rows={2} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => saveSession({ dolor_antes: painBefore, dolor_despues: painAfter, fatiga: fatigueLevel, comentario: painComment })} className="premium-btn flex-1 py-4 bg-[#8ad3cf] text-[#001514] rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all">
                  Enviar Reporte
                </button>
                <button onClick={() => {
                  setShowPainReport(false);
                  saveSession();
                }} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all">
                  Omitir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish modal */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-modal glass-panel rounded-3xl p-8 md:p-10 max-w-md text-center mx-4"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 lg:w-[120px] lg:h-[120px] flex items-center justify-center mx-auto mb-4"
              >
                <MascotAnimation type="success" size="md" className="w-full h-full" />
              </motion.div>
              <h2 className="text-white text-3xl font-bold mb-2">¡Sesión Completada!</h2>
              <p className="text-white/60 mb-6">Has completado {currentSet} series con {repCount} repeticiones.</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div><p className="text-white/40 text-xs">Tiempo</p><p className="text-white text-xl font-bold">{formatTime(timer)}</p></div>
                <div><p className="text-white/40 text-xs">Repeticiones</p><p className="text-white text-xl font-bold">{repCount}</p></div>
                <div><p className="text-white/40 text-xs">Calidad</p><p className="text-white text-xl font-bold">{qualityScore}%</p></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => navigate('/stats')} className="premium-btn flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all">
                  Ver Progreso
                </button>
                <button onClick={() => navigate('/dashboard-paciente')} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all">
                  Inicio
                </button>
              </div>
            </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
