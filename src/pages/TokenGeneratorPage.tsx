import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { SkeletonCard as SkeletonCardUI } from '../components/ui/Skeleton';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { cn } from '../lib/utils';
import { EmailFeatureModal } from '../components/ui/EmailFeatureModal';

interface TokenRow {
  id: string;
  token: string;
  patientName: string | null;
  status: 'pendiente' | 'activado' | 'expirado';
  createdAt: string;
}

const filters = ['Todos', 'Pendiente', 'Activado', 'Expirado'];

export function TokenGeneratorPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailModalToken, setEmailModalToken] = useState<TokenRow | null>(null);

  useEffect(() => {
    loadTokens();
  }, [user?.id]);

  const loadTokens = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activation_tokens')
        .select('id, token, paciente_id, terapeuta_id, created_at')
        .eq('terapeuta_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setTokens([]);
        return;
      }

      // Get patient names
      const patientIds = data.map((d) => d.paciente_id).filter(Boolean);
      let patientMap: Record<string, string> = {};
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', patientIds);
        if (profiles) {
          patientMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));
        }
      }

      setTokens(data.map((t) => ({
        id: t.id,
        token: t.token,
        patientName: t.paciente_id ? patientMap[t.paciente_id] ?? 'Paciente' : null,
        status: t.paciente_id ? 'activado' : 'pendiente',
        createdAt: t.created_at,
      })));
    } catch {
      toast.error('Error cargando tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const [waveKey] = useState(0);

  const regenerateToken = async (id: string) => {
    try {
      const newToken = String(Math.floor(100000 + Math.random() * 900000));
      const { error } = await supabase
        .from('activation_tokens')
        .update({ token: newToken })
        .eq('id', id);
      if (error) throw error;
      toast.success('Token regenerado');
      loadTokens();
    } catch {
      toast.error('Error regenerando token');
    }
  };

  const deleteToken = async (id: string) => {
    try {
      const { error } = await supabase.from('activation_tokens').delete().eq('id', id);
      if (error) throw error;
      toast.success('Token eliminado');
      loadTokens();
    } catch {
      toast.error('Error eliminando token');
    }
  };

  const copyToken = (id: string, token: string) => {
    try {
      navigator.clipboard?.writeText(token);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('No se pudo copiar el token');
    }
  };

  const filteredTokens = tokens.filter((t) => {
    if (activeFilter === 0) return true;
    return t.status === filters[activeFilter].toLowerCase();
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-end relative">
        {waveKey > 0 && (
          <div
            key={waveKey}
            className="wave-expand-effect w-32 h-32 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animationDuration: '0.8s' }}
          />
        )}
        <div className="relative z-10">
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living">Tokens de Acceso</h1>
          <p className="text-on-surface-variant font-body-lg">Gestiona los tokens de acceso para tus pacientes.</p>
        </div>

      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {filters.map((f, i) => (
          <button
            key={f}
            onClick={() => setActiveFilter(i)}
            className={cn(
              'px-5 py-3 rounded-full font-label-md whitespace-nowrap transition-all',
              i === activeFilter ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Token cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCardUI />
          <SkeletonCardUI />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="empty-state-premium glass-panel p-12 rounded-3xl text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mx-auto mb-4">
            <Icon name="key" size={32} />
          </div>
          <h3 className="font-title-md text-title-md text-on-surface mb-2">No hay tokens</h3>
          <p className="text-on-surface-variant text-sm mb-4">Aún no has creado ningún token. Los tokens se generan automáticamente al cargar un nuevo paciente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTokens.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <GlassPanel className="card-glow-hover shadow-ambient-teal p-6 rounded-3xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] uppercase text-outline font-bold tracking-wider mb-1">Token</p>
                    <div className="flex items-center gap-3">
                      <span className="font-display-lg text-2xl lg:text-display-lg text-primary tracking-[0.15em] lg:tracking-[0.2em] break-all">{t.token}</span>
                      <button
                        onClick={() => copyToken(t.id, t.token)}
                        aria-label="Copiar token"
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95',
                          copiedId === t.id ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary/10 text-primary hover:bg-primary/20',
                        )}
                      >
                        <Icon name={copiedId === t.id ? 'check' : 'content_copy'} size={18} />
                      </button>
                    </div>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold',
                    t.status === 'pendiente' && 'bg-tertiary-container/20 text-tertiary',
                    t.status === 'activado' && 'bg-success/15 text-success',
                    t.status === 'expirado' && 'bg-error-container text-on-error-container',
                  )}>
                    {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Icon name="person" size={16} className="text-outline" />
                    {t.patientName || 'Sin asignar'}
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Icon name="schedule" size={16} className="text-outline" />
                    {new Date(t.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-outline-variant/10">
                  <button
                    onClick={() => regenerateToken(t.id)}
                    className="flex-1 py-3 rounded-xl bg-surface-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-variant/50 transition-all flex items-center justify-center gap-1"
                  >
                    <Icon name="refresh" size={16} /> Regenerar
                  </button>
                  <button
                    onClick={() => {
                      if (t.patientName) setEmailModalToken(t);
                      else toast.error('Token sin paciente asignado');
                    }}
                    className="flex-1 py-3 rounded-xl bg-surface-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-variant/50 transition-all flex items-center justify-center gap-1"
                  >
                    <Icon name="mail" size={16} /> Enviar
                  </button>
                  <button
                    onClick={() => deleteToken(t.id)}
                    aria-label="Eliminar token"
                    className="py-3 px-3 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}

      <EmailFeatureModal
        open={emailModalToken !== null}
        onClose={() => setEmailModalToken(null)}
        recipientName={emailModalToken?.patientName}
      />
    </div>
  );
}
