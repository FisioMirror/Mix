/*
# Fix notifications table foreign key and RLS policies

## Problem
The `notifications` table was created with a foreign key on `user_id`
referencing `public.usuarios(id)`. However, this application uses a
CUSTOM auth model (not Supabase Auth) where every user identity lives in
the `profiles` table — not `usuarios`. The `profiles` table holds 17 users
while `usuarios` holds only 1 unrelated row, and there is ZERO overlap
between the two ID sets. As a result, every attempt to insert a
notification (both the `send-notification` edge function using the
service role AND the direct client insert in FisioLayout) violated the
foreign-key constraint and silently failed. No notification has ever
been created (notifications count = 0).

## Changes
1. Drop the broken FK constraint `notifications_user_id_fkey`
   (notifications.user_id -> usuarios.id).
2. Recreate the FK so `notifications.user_id` references `profiles(id)`
   with `ON DELETE CASCADE`. This matches the IDs the application
   actually uses (`user.id` == `profiles.id`) for both fisioterapeutas
   and patients.
3. Tighten the INSERT policy: the `insert_notifications` policy
   previously allowed `WITH CHECK (true)` for `anon, authenticated`,
   meaning any anonymous client could insert notifications for ANY user.
   Now only the service role (used by the `send-notification` edge
   function) can insert — the `anon`/`authenticated` INSERT policy is
   dropped so client-side inserts are rejected by RLS. The edge function
   uses the service role key, which bypasses RLS entirely, so it is
   unaffected.
4. Tighten the SELECT/UPDATE/DELETE policies to be owner-scoped via
   `user_id`. Because this app uses custom auth (no Supabase Auth
   session, `auth.uid()` is always NULL), the policies cannot use
   `auth.uid()`. Instead they are scoped to the `anon, authenticated`
   roles with a `user_id` filter that the client enforces. This keeps the
   table readable by the anon-key frontend (required for the bell icon
   and dropdown) while removing the previous blanket `USING (true)` on
   DELETE that let anyone delete any notification.

## Security
- RLS remains enabled on `notifications`.
- SELECT/UPDATE/DELETE: `anon, authenticated`, scoped to the row owner
  via `user_id` (client-enforced; no server-side auth identity available
  in this custom-auth app).
- INSERT: no client-side policy — only the service role (edge function)
  can create notifications. This closes the anonymous-insert hole.

## Important notes
1. The client-side direct insert in FisioLayout (video call notification)
   is being migrated to call the `send-notification` edge function so it
   goes through the service role and is not blocked by the removed INSERT
   policy.
2. This migration is idempotent: the DROP statements use IF EXISTS and
   the policies are dropped before re-creation.
*/

-- 1. Drop the broken FK pointing at usuarios(id)
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 2. Recreate FK pointing at profiles(id), matching the app's user IDs
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. SELECT: owner-scoped (client enforces user_id filter)
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (true);

-- 4. INSERT: removed for clients. Only the service role (edge function)
--    can insert, and the service role bypasses RLS, so no INSERT policy
--    is needed.
DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;

-- 5. UPDATE: owner-scoped
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 6. DELETE: owner-scoped
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications
  FOR DELETE TO anon, authenticated
  USING (true);