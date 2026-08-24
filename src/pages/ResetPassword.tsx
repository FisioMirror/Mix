import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { Spinner } from '../components/ui/Loader';
import { useToast } from '../components/ui/ToastProvider';
import { supabase } from '../lib/supabase';

export function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Error al actualizar la contraseña: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-gradient-page min-h-dvh flex flex-col items-center justify-center font-body-lg text-on-surface overflow-y-auto relative p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card w-full max-w-[420px] p-10 rounded-[2.5rem] shadow-[0px_12px_40px_rgba(0,0,0,0.08)] flex flex-col gap-y-6 relative z-10 card-glow-hover"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-breathe-icon">
            <Icon name="lock_reset" filled size={32} className="text-primary" />
          </div>
          <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary">Nueva Contraseña</h2>
          <p className="text-on-surface-variant font-body-lg">Ingresa tu nueva contraseña para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-y-6">
          <div className="relative">
            <Icon name="lock" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="glass-input w-full pl-12 pr-12 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
            </button>
          </div>
          <div className="relative">
            <Icon name="lock" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              className="glass-input w-full pl-12 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-btn w-full bg-primary py-4 rounded-2xl text-on-primary font-title-md text-title-md shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Spinner size={20} className="text-on-primary" /> Actualizando...</> : <><Icon name="check_circle" size={20} className="animate-breathe-icon" /> Cambiar contraseña</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
