import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  dismissable?: boolean;
}

export function GlassModal({ isOpen, onClose, children, size = 'md', dismissable = true }: GlassModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const maxWidth = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'full' ? 'max-w-full mx-4' : 'max-w-md';
  // Always clamp to the viewport so the panel can never overflow horizontally,
  // regardless of how narrow the screen is. The outer wrapper has p-4 padding,
  // so cap at calc(100vw - 2rem) to leave room for that padding on both sides.
  const viewportClamp = 'max-w-[calc(100vw-2rem)]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissable && onClose()}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl glass-modal p-6',
              maxWidth,
              viewportClamp,
            )}
          >
            {dismissable && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
