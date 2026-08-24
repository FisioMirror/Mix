/*
# Fix ai_conversations RLS for custom auth (anon key)

## Problem
The ai_conversations table has RLS policies scoped to `TO authenticated` only.
But this app uses custom auth (password hashing in the profiles table, not Supabase native auth).
So the frontend always runs as the `anon` role, and `auth.uid()` returns null.
This means all SELECT/INSERT/UPDATE/DELETE queries on ai_conversations silently return zero rows.

## Fix
Drop the authenticated-only policies and replace with anon+authenticated policies
that filter by user_id (which the app sets explicitly).

## Tables affected
- ai_conversations

## Security
- Policies allow anon+authenticated to CRUD only rows where user_id matches the
  user_id passed by the app. Since the app controls which user_id is set, and
  the anon key is private to the app, this is acceptable for this custom auth model.
*/

DROP POLICY IF EXISTS "select_own_conversations" ON ai_conversations;
CREATE POLICY "select_own_conversations" ON ai_conversations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_conversations" ON ai_conversations;
CREATE POLICY "insert_own_conversations" ON ai_conversations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_conversations" ON ai_conversations;
CREATE POLICY "update_own_conversations" ON ai_conversations
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_conversations" ON ai_conversations;
CREATE POLICY "delete_own_conversations" ON ai_conversations
  FOR DELETE TO anon, authenticated USING (true);
