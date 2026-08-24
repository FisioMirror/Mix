import { createClient } from '@supabase/supabase-js';
import { SUPABASE_FALLBACK } from '../config/supabase-fallback';

let configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
let configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!configuredUrl || configuredUrl.includes('knbgeddxslrtfkhcohgb')) {
  console.warn('⚠️ Detectadas credenciales antiguas. Usando respaldo de seguridad.');
  configuredUrl = SUPABASE_FALLBACK.url;
  configuredAnonKey = SUPABASE_FALLBACK.anonKey;
}

if (!configuredAnonKey || configuredAnonKey.includes('knbgeddxslrtfkhcohgb')) {
  configuredAnonKey = SUPABASE_FALLBACK.anonKey;
}

export const supabaseUrl = configuredUrl;
export const supabaseAnonKey = configuredAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
