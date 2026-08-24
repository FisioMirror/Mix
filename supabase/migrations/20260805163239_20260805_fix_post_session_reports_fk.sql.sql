-- Fix post_session_reports FK: change from auth.users to public.profiles
ALTER TABLE public.post_session_reports
  DROP CONSTRAINT IF EXISTS post_session_reports_paciente_id_fkey;
ALTER TABLE public.post_session_reports
  ADD CONSTRAINT post_session_reports_paciente_id_fkey
  FOREIGN KEY (paciente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;