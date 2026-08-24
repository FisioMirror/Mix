import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function ComingSoonModal({
  open,
  onClose,
  title = 'Próximamente',
  description = 'Esta funcionalidad estará disponible próximamente en FisioMirror.',
}: ComingSoonModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm rounded-2xl p-6 bg-surface/95 backdrop-blur-xl border border-outline-variant/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles size={32} className="text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-on-surface">{title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useComingSoon() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<{ title?: string; description?: string }>({});

  const show = (title?: string, description?: string) => {
    setConfig({ title, description });
    setOpen(true);
  };

  const modal = <ComingSoonModal open={open} onClose={() => setOpen(false)} {...config} />;

  return { show, modal };
}
