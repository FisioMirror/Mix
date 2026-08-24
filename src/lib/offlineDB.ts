const DB_NAME = 'fisiomirror-offline';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('patient_exercises')) {
        db.createObjectStore('patient_exercises', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('rutinas')) {
        db.createObjectStore('rutinas', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => resolve(null);
  });
}

export async function saveExercises(exercises: Record<string, unknown>[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction('patient_exercises', 'readwrite');
  const store = tx.objectStore('patient_exercises');
  store.clear();
  exercises.forEach((ex) => store.put(ex));
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getExercises<T = Record<string, unknown>>(): Promise<T[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction('patient_exercises', 'readonly');
    const store = tx.objectStore('patient_exercises');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => resolve([]);
  });
}

export async function saveRoutine(routine: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction('rutinas', 'readwrite');
  tx.objectStore('rutinas').put(routine);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getRoutine<T = Record<string, unknown>>(): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction('rutinas', 'readonly');
    const req = tx.objectStore('rutinas').getAll();
    req.onsuccess = () => resolve(req.result?.[0] as T ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put({ key, value });
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get(key);
    req.onsuccess = () => resolve((req.result as { key: string; value: T })?.value ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(['patient_exercises', 'rutinas', 'meta'], 'readwrite');
  tx.objectStore('patient_exercises').clear();
  tx.objectStore('rutinas').clear();
  tx.objectStore('meta').clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
