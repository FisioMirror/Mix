-- Revoke EXECUTE from anon/authenticated on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION hash_password(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION login_usuario(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION registrar_fisioterapeuta(text, text, text, text, text, text, integer, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION registrar_paciente(text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION validar_token(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION crear_token_activacion(uuid, text) FROM anon, authenticated;

-- Fix set_updated_at search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public, extensions;