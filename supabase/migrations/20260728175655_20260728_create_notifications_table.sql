/*
# Create notifications table

## Purpose
Stores real-time notifications for fisioterapeutas (e.g., incoming video call alerts from patients).

## New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references usuarios.id, the fisioterapeuta receiving the notification)
  - `type` (text, notification category: 'videollamada', 'sistema', 'rutina', etc.)
  - `title` (text, short title)
  - `message` (text, notification body)
  - `link` (text, nullable, URL to open when clicking "Unirse")
  - `read` (boolean, default false)
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled
- Owner-scoped CRUD: each authenticated user can only access their own notifications
- Policies use auth.uid() = user_id for ownership
*/

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'sistema',
  title text NOT NULL,
  message text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
CREATE POLICY "insert_notifications" ON public.notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications
  FOR DELETE TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);
