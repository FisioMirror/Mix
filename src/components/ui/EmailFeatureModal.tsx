import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

interface EmailFeatureModalProps {
  open: boolean;
  onClose: () => void;
  recipientName?: string | null;
}

/**
 * Informative modal shown when a user attempts to use the "send by email"
 * feature before an email provider (SendGrid/Resend) has been configured.
 *
 * Replaces the previous "próximamente"-style toast with a clear explanation
 * of what the feature will do and when it is expected to be available.
 */
export function EmailFeatureModal({ open, onClose, recipientName }: EmailFeatureModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel rounded-3xl p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="mark_email_unread" size={32} className="text-tertiary" />
            </div>

            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">
              Envío por correo electrónico
            </h3>

            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
              {recipientName ? (
                <>
                  Pronto podrás enviar notificaciones y accesos directamente al correo
                  de <span className="font-bold text-on-surface">{recipientName}</span> sin
                  salir de FisioMirror.
                </>
              ) : (
                <>
                  Pronto podrás enviar tokens de acceso y recetas directamente al correo
                  de tus pacientes sin salir de FisioMirror.
                </>
              )}
            </p>

            <div className="bg-surface-container-low/60 rounded-2xl p-4 mb-6 text-left space-y-3">
              <div className="flex items-start gap-3">
                <Icon name="check_circle" size={20} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">Qué hará:</span> entregará al
                  paciente su token de acceso (o la receta prescrita) con instrucciones
                  paso a paso para entrar a la plataforma.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="schedule" size={20} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">Disponibilidad:</span> planificado
                  para el próximo trimestre, una vez integrado un proveedor de email
                  (SendGrid o Resend).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="info" size={20} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">Alternativa actual:</span> copia
                  el token o imprime la receta y compártela por el canal que prefieras.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[0.98] transition-all"
            >
              Entendido
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
