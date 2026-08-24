import { useCallback, useEffect, useState } from 'react';

export interface AccessibilitySettings {
  talkback: boolean;
  easyReading: boolean;
  highContrast: boolean;
  largeTouchTargets: boolean;
  reduceMotion: boolean;
}

const STORAGE_KEY = 'fisiomirror-accessibility';

const DEFAULTS: AccessibilitySettings = {
  talkback: false,
  easyReading: false,
  highContrast: false,
  largeTouchTargets: true,
  reduceMotion: false,
};

function loadSettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULTS;
}

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* noop */ }

    const root = document.documentElement;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('easy-reading', settings.easyReading);
    root.classList.toggle('large-touch', settings.largeTouchTargets);
    root.classList.toggle('talkback', settings.talkback);
    root.classList.toggle('reduce-motion', settings.reduceMotion);
  }, [settings]);

  const update = useCallback((partial: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const speak = useCallback((text: string) => {
    if (!settings.talkback || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    speechSynthesis.speak(utterance);
  }, [settings.talkback]);

  const stopSpeaking = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }, []);

  return { settings, update, speak, stopSpeaking };
}
