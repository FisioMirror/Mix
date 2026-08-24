import { AnimatePresence, motion } from 'framer-motion';
import { X, Download, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useInstall } from '../../lib/installContext';

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      onAnimationComplete={(def) => {
        if ((def as Record<string, unknown>).opacity === 0) onDone();
      }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] max-w-xs w-full mx-4"
    >
      <div className="bg-slate-800 dark:bg-slate-700 text-white text-sm rounded-2xl px-4 py-3 shadow-xl text-center leading-snug">
        {message}
      </div>
    </motion.div>
  );
}

export function InstallModal() {
  const { modalOpen, closeModal, triggerInstall, isInstallable } = useInstall();
  const [toast, setToast] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleInstall = async () => {
    if (!isInstallable) {
      closeModal();
      setToast('Abrí el menú del navegador y tocá "Agregar a pantalla principal" o "Instalar app".');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }
    const outcome = await triggerInstall();
    if (outcome === 'accepted') {
      closeModal();
    }
  };

  return (
    <>
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="install-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              key="install-modal"
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 text-center">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 p-1.5 rounded-xl text-primary-400 dark:text-slate-400 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* App icon */}
                <div className="mx-auto mb-4 w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/40">
                  <img
                    src="/192x192.png"
                    alt="FisioMirror"
                    className="w-full h-full object-cover"
                  />
                </div>

                <h2 className="text-xl font-bold text-primary-800 dark:text-slate-100">
                  Instalá FisioMirror
                </h2>
                <p className="mt-1 text-sm text-primary-500 dark:text-slate-400 font-medium">
                  Tele-rehabilitación inteligente
                </p>
              </div>

              {/* Body */}
              <div className="px-6 pb-2">
                <p className="text-sm text-primary-600 dark:text-slate-300 text-center leading-relaxed">
                  FisioMirror te permite hacer ejercicios de tele-rehabilitación guiados por IA.
                  Instalala en tu dispositivo para acceder más rápido, incluso sin conexión.
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-primary-500 dark:text-slate-400">
                    <Smartphone className="w-4 h-4 text-accent flex-shrink-0" />
                    Acceso directo desde tu pantalla de inicio
                  </div>
                  <div className="flex items-center gap-2 text-xs text-primary-500 dark:text-slate-400">
                    <Download className="w-4 h-4 text-accent flex-shrink-0" />
                    Disponible sin conexión a internet
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-5 flex flex-col gap-2">
                <button
                  onClick={handleInstall}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-600 to-accent text-white font-semibold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Instalar ahora
                </button>
                <button
                  onClick={closeModal}
                  className="w-full py-3 px-4 rounded-2xl text-primary-500 dark:text-slate-400 font-medium text-sm hover:bg-white/20 active:scale-[0.98] transition-all"
                >
                  Ahora no
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => setToast(null)}>
        {showToast && toast && (
          <Toast key="install-toast" message={toast} onDone={() => setShowToast(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
