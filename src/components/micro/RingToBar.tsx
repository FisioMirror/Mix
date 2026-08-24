import { useState, useEffect, useRef } from 'react';

const CIRCUMFERENCE = 314.16;

const RingToBar = () => {
  const [progress, setProgress] = useState(0);
  const [progressState, setProgressState] = useState<'idle' | 'running' | 'complete'>('idle');
  const intervalRef = useRef<number | null>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  const resetProgress = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0); setProgressState('idle');
    if (ringRef.current) ringRef.current.style.strokeDashoffset = CIRCUMFERENCE.toString();
  };

  const startSimulation = () => {
    if (progressState === 'running') return;
    resetProgress(); setProgressState('running');
    setTimeout(() => {
      let current = 0;
      intervalRef.current = window.setInterval(() => {
        current += 1.5;
        if (current >= 100) { current = 100; if (intervalRef.current) clearInterval(intervalRef.current); setProgressState('complete'); }
        setProgress(current);
        if (ringRef.current) ringRef.current.style.strokeDashoffset = (CIRCUMFERENCE - (current / 100) * CIRCUMFERENCE).toString();
      }, 30);
    }, 200);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" stroke="#e2e8f0" strokeWidth="8" fill="none" />
          <circle ref={ringRef} cx="60" cy="60" r="50" stroke="#14b8a6" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE} className="transition-all duration-100" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-teal-600">{Math.round(progress)}%</div>
      </div>
      <div className="w-52 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <button className="px-6 py-3 bg-teal-500 text-white rounded-full font-semibold disabled:opacity-50" onClick={startSimulation} disabled={progressState === 'running'}>
        {progressState === 'idle' && '🚀 Simular Descarga'}
        {progressState === 'running' && '⏳ Descargando...'}
        {progressState === 'complete' && '✅ Descarga Completa'}
      </button>
      {progressState === 'complete' && <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-full" onClick={resetProgress}>🔄 Reiniciar</button>}
    </div>
  );
};
export default RingToBar;
