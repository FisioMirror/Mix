import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, Rol } from '../types';
import { supabase, supabaseUrl } from '../lib/supabase';

const STORAGE_KEY = 'fisiomirror-auth';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const functionsUrl = `${supabaseUrl}/functions/v1`;

export interface FisioSignupData {
  cedula: string;
  universidad: string;
  colegiadoId: string;
  especialidades: string[];
  credencialUrl?: string;
  anioEgreso?: string;
  telefono?: string;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error('Error de red');
}

async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

async function fetchProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

async function createProfileFromAuth(userId: string, email: string, fullName: string, role: Rol): Promise<Profile | null> {
  const newProfile: Record<string, unknown> = {
    id: userId,
    email: email.toLowerCase().trim(),
    full_name: fullName,
    role,
    is_active: role === 'fisioterapeuta',
    password_hash: 'TOKEN_AUTH',
  };
  const { data, error } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

interface AuthState {
  user: Profile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithToken: (token: string) => Promise<boolean>;
  signUpFisio: (
    email: string,
    password: string,
    fullName: string,
    data: FisioSignupData,
  ) => Promise<boolean>;
  signUpPaciente: (email: string, password: string, fullName: string) => Promise<boolean>;
  validateToken: (token: string) => Promise<boolean>;
  signOut: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      error: null,
      initialized: false,

      initialize: async () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            set({ initialized: true });
            return;
          }
          const parsed = JSON.parse(raw);
          const storedAt = parsed?.state?.storedAt as number | undefined;
          if (storedAt && Date.now() - storedAt > SESSION_MAX_AGE_MS) {
            localStorage.removeItem(STORAGE_KEY);
            set({ user: null, initialized: true });
            return;
          }
          const storedUser = parsed?.state?.user as Profile | null;
          if (storedUser) {
            set({ user: storedUser, initialized: true });
            try {
              const refreshed = await Promise.race([
                fetchProfileById(storedUser.id),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
              ]);
              if (refreshed) set({ user: refreshed, initialized: true });
            } catch {
              // keep stored user
            }
          } else {
            set({ initialized: true });
          }
        } catch {
          set({ initialized: true });
        }
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await fetchWithRetry(`${functionsUrl}/auth-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.status === 429) {
            set({ error: 'Demasiados intentos. Espera un minuto.', loading: false });
            return false;
          }
          if (!res.ok || !data.success) {
            set({ error: data.error || 'Error al iniciar sesión', loading: false });
            return false;
          }

          const userId = data.user_id as string | null;
          const userEmail = data.email as string | null;
          if (!userId || !userEmail) {
            set({ error: 'Respuesta inválida del servidor', loading: false });
            return false;
          }

          let profile = await fetchProfileById(userId);
          if (!profile) profile = await fetchProfileByEmail(userEmail);
          if (!profile) {
            set({ error: 'No se encontró tu perfil. Contacta a tu fisioterapeuta.', loading: false });
            return false;
          }

          set({ user: profile, loading: false });
          return true;
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          return false;
        }
      },

      signUpFisio: async (email, password, fullName, signupData) => {
        set({ loading: true, error: null });
        try {
          const res = await fetchWithRetry(`${functionsUrl}/auth-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.toLowerCase().trim(),
              password,
              fullName,
              role: 'fisioterapeuta',
              especialidad: signupData.especialidades.join(', ') || null,
              universidad: signupData.universidad || null,
              telefono: signupData.telefono || null,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.status === 429) {
            set({ error: 'Demasiados intentos. Espera un minuto.', loading: false });
            return false;
          }
          if (!res.ok || !data.success) {
            set({ error: data.error || 'Error al crear la cuenta', loading: false });
            return false;
          }

          const userId = data.user_id as string | null;
          const userEmail = data.email as string | null;
          if (!userId || !userEmail) {
            set({ error: 'Respuesta inválida del servidor', loading: false });
            return false;
          }

          let profile = await fetchProfileById(userId);
          if (!profile) profile = await fetchProfileByEmail(userEmail);
          if (!profile) {
            profile = await createProfileFromAuth(userId, userEmail, fullName, 'fisioterapeuta');
          }
          if (!profile) {
            set({ error: 'No se pudo crear tu perfil', loading: false });
            return false;
          }

          const updates: Record<string, unknown> = {};
          if (signupData.cedula) updates.cedula = signupData.cedula;
          if (signupData.colegiadoId) updates.colegiado_id = signupData.colegiadoId;
          if (signupData.credencialUrl) updates.credencial_url = signupData.credencialUrl;
          if (signupData.anioEgreso) updates.anio_egreso = parseInt(signupData.anioEgreso, 10);
          if (signupData.universidad) updates.universidad = signupData.universidad;
          if (signupData.especialidades.length > 0) {
            updates.especialidad = signupData.especialidades.join(', ');
          }
          if (signupData.telefono) updates.telefono = signupData.telefono;

          if (Object.keys(updates).length > 0) {
            try {
              await supabase.from('profiles').update(updates).eq('id', userId);
              const refreshed = await fetchProfileById(userId);
              if (refreshed) profile = refreshed;
            } catch {
              // non-critical
            }
          }

          if (signupData.especialidades.length > 0) {
            try {
              const { data: espRows } = await supabase
                .from('especialidades')
                .select('id, nombre')
                .in('nombre', signupData.especialidades);
              if (espRows && espRows.length > 0) {
                const relRows = espRows.map((e) => ({
                  profile_id: userId,
                  especialidad_id: e.id,
                }));
                await supabase.from('profile_especialidades').insert(relRows);
              }
            } catch {
              // non-critical
            }
          }

          set({ user: profile, loading: false });
          return true;
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          return false;
        }
      },

      signInWithToken: async (token) => {
        set({ loading: true, error: null });
        try {
          const { data: tokenRow, error: tokenError } = await supabase
            .from('activation_tokens')
            .select('id, token, paciente_id, terapeuta_id')
            .eq('token', token.trim())
            .maybeSingle();

          if (tokenError) {
            set({ error: tokenError.message, loading: false });
            return false;
          }
          if (!tokenRow) {
            set({ error: 'Token inválido', loading: false });
            return false;
          }
          const row = tokenRow as {
            id: string;
            paciente_id: string | null;
            terapeuta_id: string | null;
          };
          if (!row.paciente_id) {
            set({ error: 'Este token no tiene un paciente asignado', loading: false });
            return false;
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', row.paciente_id)
            .maybeSingle();
          if (profileError || !profile) {
            set({ error: 'No se encontró el perfil del paciente', loading: false });
            return false;
          }

          await supabase
            .from('profiles')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', row.paciente_id);
          if (row.terapeuta_id) {
            await supabase
              .from('pacientes_terapeutas')
              .upsert({ paciente_id: row.paciente_id, terapeuta_id: row.terapeuta_id });
          }

          const { password_hash: _, ...userWithoutHash } = profile;
          set({ user: userWithoutHash as Profile, loading: false });
          return true;
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          return false;
        }
      },

      signUpPaciente: async (email, password, fullName) => {
        set({ loading: true, error: null });
        try {
          const res = await fetchWithRetry(`${functionsUrl}/auth-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.toLowerCase().trim(),
              password,
              fullName,
              role: 'paciente',
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.status === 429) {
            set({ error: 'Demasiados intentos. Espera un minuto.', loading: false });
            return false;
          }
          if (!res.ok || !data.success) {
            set({ error: data.error || 'Error al crear la cuenta', loading: false });
            return false;
          }

          const userId = data.user_id as string | null;
          const userEmail = data.email as string | null;
          if (!userId || !userEmail) {
            set({ error: 'Respuesta inválida del servidor', loading: false });
            return false;
          }

          let profile = await fetchProfileById(userId);
          if (!profile) profile = await fetchProfileByEmail(userEmail);
          if (!profile) {
            profile = await createProfileFromAuth(userId, userEmail, fullName, 'paciente');
          }
          if (!profile) {
            set({ error: 'No se pudo crear tu perfil', loading: false });
            return false;
          }

          set({ user: profile, loading: false });
          return true;
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          return false;
        }
      },

      validateToken: async (token) => {
        try {
          const { data, error } = await supabase
            .from('activation_tokens')
            .select('paciente_id')
            .eq('token', token.trim())
            .maybeSingle();
          if (error || !data) return false;
          return (data as { paciente_id: string | null }).paciente_id !== null;
        } catch {
          return false;
        }
      },

      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        set({ user: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        storedAt: Date.now(),
      }),
    },
  ),
);
