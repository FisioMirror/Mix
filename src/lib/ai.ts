export type AIJobType = 'image_analysis' | 'text_generation' | 'insights' | 'summaries' | 'pdf_report';

export interface AIJobInput {
  imageBase64?: string; mimeType?: string; prompt?: string; userPrompt?: string;
  systemPrompt?: string; temperature?: number; maxTokens?: number;
  context?: Record<string, unknown>; data?: Record<string, unknown>;
  summaryType?: string; audioTranscription?: string;
}

export interface AIJobResult { success: boolean; result?: string; error?: string; }

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const POLL_INTERVAL_MS = 2500;
const DEFAULT_TIMEOUT_MS = 120_000;

export function normalizeBase64(raw: string): string {
  let b64 = raw;
  const commaIdx = b64.indexOf(',');
  if (b64.startsWith('data:') && commaIdx !== -1) b64 = b64.slice(commaIdx + 1);
  b64 = b64.replace(/\s+/g, '');
  return b64;
}

export function inferMimeType(dataUrl: string, fallback?: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (match) return match[1];
  return fallback || 'image/jpeg';
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { const res = await fetch(url, options); return res; }
    catch (e) { lastError = e instanceof Error ? e : new Error(String(e)); if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); }
  }
  throw lastError ?? new Error('Error de red');
}

export async function createAIJob(type: AIJobType, input_data: AIJobInput): Promise<string | null> {
  const response = await fetchWithRetry('/api/create-job', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ type, input_data }),
  });
  if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Error al crear job de IA'); }
  const data = await response.json();
  return data.job_id as string;
}

export async function pollAIJob(jobId: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<AIJobResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let response: Response;
    try {
      response = await fetchWithRetry(`/api/get-job?job_id=${jobId}`, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    } catch (e) { return { success: false, error: (e as Error).message }; }
    if (response.status === 404) return { success: false, error: 'Job no encontrado' };
    if (!response.ok) { const err = await response.json().catch(() => ({})); return { success: false, error: err.error || 'Error al consultar job' }; }
    const data = await response.json();
    if (data.status === 'completed') return { success: true, result: data.result };
    if (data.status === 'failed') return { success: false, error: data.error || 'El job de IA falló' };
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return { success: false, error: 'Tiempo de espera agotado.' };
}

export async function runAIJob(type: AIJobType, input_data: AIJobInput, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<AIJobResult> {
  try {
    const normalizedInput: AIJobInput = { ...input_data };
    if (normalizedInput.imageBase64) normalizedInput.imageBase64 = normalizeBase64(normalizedInput.imageBase64);
    const jobId = await createAIJob(type, normalizedInput);
    if (!jobId) return { success: false, error: 'No se pudo crear el job' };
    return await pollAIJob(jobId, timeoutMs);
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function transcribeAudio(audioBase64: string, mimeType?: string): Promise<{ success: boolean; transcription?: string; error?: string }> {
  try {
    const cleanBase64 = normalizeBase64(audioBase64);
    const response = await fetchWithRetry('/api/transcribe-audio', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ audioBase64: cleanBase64, mimeType: mimeType || 'audio/webm' }),
    });
    if (!response.ok) { const err = await response.json().catch(() => ({})); return { success: false, error: err.error || 'Error al transcribir audio' }; }
    const data = await response.json();
    return { success: true, transcription: data.text };
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function ocrUpdatePatient(imageBase64: string, patientId: string, mimeType?: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const cleanBase64 = normalizeBase64(imageBase64);
    const response = await fetchWithRetry('/api/ocr-prescripcion', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ imageBase64: cleanBase64, mimeType: mimeType || 'image/jpeg', mode: 'update', patientId }),
    });
    if (!response.ok) { const err = await response.json().catch(() => ({})); return { success: false, error: err.error || 'Error al analizar documento' }; }
    const data = await response.json();
    if (data.error) return { success: false, error: data.error };
    return { success: true, data };
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const result = reader.result as string; const mimeType = inferMimeType(result, file.type || 'image/jpeg'); const base64 = normalizeBase64(result); resolve({ base64, mimeType }); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
