import { useEffect, useState } from 'react';
import { saveExercises, getExercises, setMeta, getMeta } from '../lib/offlineDB';

export type OfflineStatus = 'online' | 'offline' | 'loading';

export function useOfflineExercises<T extends { id: string }>(
  pacienteId: string | undefined,
  fetchFn: () => Promise<T[]>
) {
  const [exercises, setExercises] = useState<T[]>([]);
  const [status, setStatus] = useState<OfflineStatus>('loading');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteId) return;
    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      try {
        const data = await fetchFn();
        if (cancelled) return;
        setExercises(data);
        setStatus('online');
        saveExercises(data as unknown as Record<string, unknown>[]);
        const now = new Date().toISOString();
        setLastSync(now);
        setMeta('lastSync', now);
      } catch {
        if (cancelled) return;
        const cached = await getExercises<T>();
        const syncTime = await getMeta<string>('lastSync');
        setExercises(cached);
        setLastSync(syncTime);
        setStatus('offline');
      }
    };

    load();

    return () => { cancelled = true; };
  }, [pacienteId]);

  return { exercises, status, lastSync };
}
