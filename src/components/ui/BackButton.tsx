import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from './Icon';

interface BackButtonProps {
  className?: string;
  fallback?: string;
}

export function BackButton({ className = '', fallback }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1);
    } else if (fallback) {
      navigate(fallback);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleBack}
      className={`flex items-center justify-center w-10 h-10 rounded-xl glass-panel text-on-surface-variant hover:text-primary transition-colors ${className}`}
      aria-label="Volver atrás"
    >
      <Icon name="arrow_back" size={20} />
    </motion.button>
  );
}
