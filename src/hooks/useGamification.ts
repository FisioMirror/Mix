import { useState, useEffect, useCallback, useRef } from 'react';
import { celebrateAchievement } from '../lib/confetti';

export type AchievementTier = 'bronce' | 'plata' | 'oro' | 'diamante';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
}

const STORAGE_KEY = 'fisiomirror-achievements';
const ONBOARDING_KEY = 'fisiomirror-onboarding-done';

const TIER_META: Record<AchievementTier, { color: string; glow: string; label: string }> = {
  bronce: { color: '#CD7F32', glow: 'rgba(205,127,50,0.5)', label: 'Bronce' },
  plata: { color: '#C0C0C0', glow: 'rgba(192,192,192,0.5)', label: 'Plata' },
  oro: { color: '#FFD700', glow: 'rgba(255,215,0,0.5)', label: 'Oro' },
  diamante: { color: '#67E8F9', glow: 'rgba(103,232,249,0.5)', label: 'Diamante' },
};

export function getTierMeta(tier: AchievementTier) {
  return TIER_META[tier];
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_session', title: 'Primer Paso', description: 'Completa tu primera sesión de rehabilitación', tier: 'bronce', icon: 'directions_walk', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 1 },
  { id: 'three_sessions', title: 'Constancia', description: 'Completa 3 sesiones de rehabilitación', tier: 'plata', icon: 'repeat', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 3 },
  { id: 'five_sessions', title: 'Dedicación', description: 'Completa 5 sesiones de rehabilitación', tier: 'oro', icon: 'self_improvement', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 5 },
  { id: 'ten_sessions', title: 'Guerrero de la Recuperación', description: 'Completa 10 sesiones de rehabilitación', tier: 'diamante', icon: 'emoji_events', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 10 },
  { id: 'streak_3', title: 'Racha de 3 Días', description: ' Practica 3 días seguidos sin interrupciones', tier: 'bronce', icon: 'local_fire_department', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 3 },
  { id: 'streak_7', title: 'Racha de 7 Días', description: 'Practica 7 días seguidos sin interrupciones', tier: 'oro', icon: 'whatshot', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 7 },
  { id: 'perfect_form', title: 'Forma Perfecta', description: 'Alcanza el rango óptimo en un ejercicio', tier: 'plata', icon: 'verified', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 1 },
  { id: 'night_owl', title: 'Lechuza Nocturna', description: 'Completa una sesión después de las 8 PM', tier: 'bronce', icon: 'nights_stay', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 1 },
  { id: 'early_bird', title: 'Madrugador', description: 'Completa una sesión antes de las 7 AM', tier: 'bronce', icon: 'wb_sunny', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 1 },
  { id: 'all_exercises', title: 'Explorador', description: 'Practica todos tus ejercicios asignados al menos una vez', tier: 'oro', icon: 'explore', unlocked: false, unlockedAt: null, progress: 0, maxProgress: 5 },
];

function loadAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACHIEVEMENTS;
    const stored = JSON.parse(raw) as Achievement[];
    const merged = DEFAULT_ACHIEVEMENTS.map(def => {
      const found = stored.find(s => s.id === def.id);
      return found ? { ...def, unlocked: found.unlocked, unlockedAt: found.unlockedAt, progress: Math.max(found.progress, def.progress) } : def;
    });
    return merged;
  } catch {
    return DEFAULT_ACHIEVEMENTS;
  }
}

function saveAchievements(achievements: Achievement[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
  } catch {
    // ignore
  }
}

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function useGamification() {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const loaded = loadAchievements();
    return loaded.map((achievement) => ({ ...achievement, progress: achievement.unlocked ? achievement.maxProgress : 0 }));
  });
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set(achievements.filter(a => a.unlocked).map(a => a.id)));

  useEffect(() => {
    saveAchievements(achievements);
    const currentUnlocked = new Set(achievements.filter(a => a.unlocked).map(a => a.id));
    const newly = achievements.find(a => a.unlocked && !prevUnlockedRef.current.has(a.id));
    if (newly) {
      setNewlyUnlocked(newly);
    }
    prevUnlockedRef.current = currentUnlocked;
  }, [achievements]);

  const recordSession = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastSessionDate = localStorage.getItem('fisiomirror-last-session-date');
    if (lastSessionDate === today) return;
    localStorage.setItem('fisiomirror-last-session-date', today);

    setAchievements(prev => {
      const updated = [...prev];
      const newUnlocks: Achievement[] = [];
      updated.forEach((ach, idx) => {
        if (ach.unlocked) return;
        if (ach.id === 'first_session' || ach.id === 'three_sessions' || ach.id === 'five_sessions' || ach.id === 'ten_sessions') {
          const newProgress = ach.progress + 1;
          if (newProgress >= ach.maxProgress) {
            updated[idx] = { ...ach, progress: newProgress, unlocked: true, unlockedAt: new Date().toISOString() };
            newUnlocks.push(updated[idx]);
          } else {
            updated[idx] = { ...ach, progress: newProgress };
          }
        }
      });
      if (newUnlocks.length > 0) {
        celebrateAchievement();
      }
      return updated;
    });
  }, []);

  const recordStreak = useCallback((days: number) => {
    setAchievements(prev => {
      const updated = [...prev];
      const newUnlocks: Achievement[] = [];
      updated.forEach((ach, idx) => {
        if (ach.unlocked) return;
        if (ach.id === 'streak_3' && days >= 3) {
          updated[idx] = { ...ach, progress: 3, unlocked: true, unlockedAt: new Date().toISOString() };
          newUnlocks.push(updated[idx]);
        } else if (ach.id === 'streak_7' && days >= 7) {
          updated[idx] = { ...ach, progress: 7, unlocked: true, unlockedAt: new Date().toISOString() };
          newUnlocks.push(updated[idx]);
        } else if (ach.id.startsWith('streak_') && !ach.unlocked) {
          updated[idx] = { ...ach, progress: Math.min(days, ach.maxProgress) };
        }
      });
      if (newUnlocks.length > 0) {
        celebrateAchievement();
      }
      return updated;
    });
  }, []);

  const unlockSpecial = useCallback((achievementId: string) => {
    setAchievements(prev => {
      const idx = prev.findIndex(a => a.id === achievementId);
      if (idx === -1 || prev[idx].unlocked) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], unlocked: true, progress: updated[idx].maxProgress, unlockedAt: new Date().toISOString() };
      celebrateAchievement();
      return updated;
    });
  }, []);

  const dismissUnlock = useCallback(() => setNewlyUnlocked(null), []);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalProgress = achievements.reduce((sum, a) => sum + (a.unlocked ? 1 : a.progress / a.maxProgress), 0) / achievements.length;

  return {
    achievements,
    newlyUnlocked,
    dismissUnlock,
    recordSession,
    recordStreak,
    unlockSpecial,
    unlockedCount,
    totalProgress,
  };
}
