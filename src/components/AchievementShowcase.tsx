import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './ui/Icon';
import MascotAnimation from './ui/MascotAnimation';
import { SparkleEffect } from './auth/SparkleEffect';
import { getTierMeta, type Achievement } from '../hooks/useGamification';

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  role: 'physio' | 'patient';
  onClose: () => void;
}

export function AchievementUnlockModal({ achievement, role, onClose }: AchievementUnlockModalProps) {
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="glass-panel rounded-[2rem] max-w-sm w-full p-8 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none">
              <SparkleEffect active={true} color={role === 'physio' ? 'teal' : 'coral'} />
            </div>

            <div className="relative z-10">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
                ¡Logro Desbloqueado!
              </p>

              <div className="w-40 h-52 mx-auto my-4 relative flex items-center justify-center">
                <SparkleEffect active={true} color={role === 'physio' ? 'teal' : 'coral'} />
                <MascotAnimation type="achievement" className="w-full h-full" />
              </div>

              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{
                  backgroundColor: `${getTierMeta(achievement.tier).color}20`,
                  color: getTierMeta(achievement.tier).color,
                }}
              >
                <Icon name={achievement.icon} filled size={18} />
                <span className="font-label-sm font-bold uppercase tracking-wide">
                  {getTierMeta(achievement.tier).label}
                </span>
              </div>

              <h3 className="font-headline-md text-headline-md-mobile lg:text-headline-md gradient-text-editorial mb-2">
                {achievement.title}
              </h3>
              <p className="text-on-surface-variant font-body-lg mb-6">
                {achievement.description}
              </p>

              <button
                onClick={onClose}
                className="premium-btn w-full py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="celebration" size={20} /> ¡Continuar!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AchievementShowcaseProps {
  achievements: Achievement[];
  compact?: boolean;
}

export function AchievementShowcase({ achievements, compact = false }: AchievementShowcaseProps) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {achievements.slice(0, 6).map((ach) => {
          const meta = getTierMeta(ach.tier);
          return (
            <div
              key={ach.id}
              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                ach.unlocked ? 'scale-100' : 'grayscale opacity-40 scale-90'
              }`}
              style={{
                backgroundColor: ach.unlocked ? `${meta.color}20` : 'rgba(0,0,0,0.05)',
                boxShadow: ach.unlocked ? `0 0 12px ${meta.glow}` : 'none',
              }}
              title={ach.title}
            >
              <Icon name={ach.icon} filled size={22} className={ach.unlocked ? '' : 'text-on-surface-variant'} style={ach.unlocked ? { color: meta.color } : undefined} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unlocked.length > 0 && (
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
            Desbloqueados ({unlocked.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {unlocked.map((ach, i) => {
              const meta = getTierMeta(ach.tier);
              return (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-2xl p-4 text-center relative overflow-hidden"
                  style={{ boxShadow: `0 0 20px ${meta.glow}` }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}20` }}
                  >
                    <Icon name={ach.icon} filled size={28} style={{ color: meta.color }} />
                  </div>
                  <p className="font-title-sm text-title-sm text-on-surface leading-tight mb-1">{ach.title}</p>
                  <p className="text-label-sm text-label-sm text-on-surface-variant line-clamp-2">{ach.description}</p>
                  <div
                    className="inline-block px-2 py-0.5 rounded-full mt-2 font-label-sm text-label-sm font-bold uppercase"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    {meta.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
            Por Desbloquear ({locked.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {locked.map((ach) => {
              const meta = getTierMeta(ach.tier);
              const pct = Math.round((ach.progress / ach.maxProgress) * 100);
              return (
                <div key={ach.id} className="glass-panel rounded-2xl p-4 text-center opacity-70">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center bg-on-surface/5">
                    <Icon name={ach.icon} filled size={28} className="text-on-surface-variant" />
                  </div>
                  <p className="font-title-sm text-title-sm text-on-surface leading-tight mb-1">{ach.title}</p>
                  <p className="text-label-sm text-label-sm text-on-surface-variant line-clamp-2 mb-2">{ach.description}</p>
                  <div className="h-1.5 rounded-full bg-on-surface/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                  <p className="text-label-sm text-label-sm text-outline mt-1">{ach.progress}/{ach.maxProgress}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
