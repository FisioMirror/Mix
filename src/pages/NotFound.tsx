import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { useAuthStore } from '../stores/authStore';

export function NotFound() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const goHome = () => {
    if (user?.role === 'fisioterapeuta') navigate('/dashboard-fisio');
    else if (user?.role === 'paciente') navigate('/dashboard-paciente');
    else navigate('/login');
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/10">
          <Icon name="explore_off" filled size={56} className="text-primary" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="font-headline-lg text-headline-lg gradient-text-editorial mb-2"
      >
        404
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-on-surface-variant font-body-lg mb-1"
      >
        La página que buscas no existe o fue movida.
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-outline font-label-sm text-label-sm mb-8"
      >
        Verifica el enlace o vuelve a tu panel principal.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        onClick={goHome}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="premium-btn bg-primary text-on-primary px-8 py-4 rounded-2xl font-title-md text-title-md shadow-glow-primary flex items-center gap-2"
      >
        <Icon name="home" size={20} />
        Volver al inicio
      </motion.button>
    </div>
  );
}

export default NotFound;
