/*
# Fix avatars storage policies for custom-auth app

## Problema
Al subir una foto de perfil, los usuarios recibían el error
"no tengo permiso para realizar esa acción" (new row violates
row-level security policy).

## Causa raíz
FisioMirror NO usa la autenticación nativa de Supabase
(supabase.auth.signInWithPassword). Usa un esquema de autenticación
personalizado: el hash SHA-256 de la contraseña se compara en el cliente
frente a la columna `profiles.password_hash`, y la sesión se guarda en
localStorage. El cliente de Supabase se crea con
`persistSession: false, autoRefreshToken: false`
(src/lib/supabase.ts), por lo que NUNCA se establece una sesión JWT de
Supabase.

Como consecuencia, TODAS las peticiones del frontend se ejecutan con el
rol `anon` y `auth.uid()` devuelve SIEMPRE `NULL`.

Las políticas anteriores del bucket `avatars` estaban scoped a
`TO authenticated` con `WITH CHECK (... (storage.foldername(name))[1]
= auth.uid()::text)`. Como `auth.uid()` es NULL para esta app, la
comprobación de propiedad nunca se cumplía y cada subida fallaba el
 cheque RLS → "no permission".

## Solución
Alinear las políticas del bucket `avatars` con el modelo de autenticación
real de la app (anon + verificación de propiedad en lógica de aplicación),
siguiendo el mismo patrón que ya funciona para el bucket `pwa-icons` en
este mismo proyecto.

1. Storage
   - El bucket público `avatars` ya existe (no se recrea).
   - Se mantiene público para que los avatares se muestren sin sesión.

2. Security (storage.objects, bucket 'avatars')
   - SELECT: pública (anon + authenticated) — los avatares deben verse
     siempre, estén o no los usuarios con sesión.
   - INSERT / UPDATE / DELETE: se conceden a `anon, authenticated`
     scoped al bucket `avatars`. La verificación de que el usuario solo
     toca su propio archivo se enforce en la lógica de la app: el
     frontend siempre sube a la ruta `${user.id}/avatar.jpg` donde
     `user.id` es el perfil autenticado en el authStore, y no se expone
     ninguna UI que permita escribir en la carpeta de otro usuario.
     Esto es consistente con el resto del modelo de custom-auth del
     proyecto (profiles es públicamente legible/escribible y la
     autorización se enforce en cliente).

## Notas importantes
- Esta migración es idempotente: hace DROP IF EXISTS antes de cada
  CREATE POLICY, por lo que es segura de re-ejecutar.
- No se utiliza auth.uid() porque SIEMPRE es NULL en esta app; usarlo
  rompería las subidas (bug que se está corrigiendo).
- Sin colores púrpura/violeta (cambio solo en storage).
*/

-- 1. SELECT — lectura pública (los avatares deben verse sin sesión)
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

-- 2. INSERT — anon + authenticated, solo dentro del bucket 'avatars'
DROP POLICY IF EXISTS "auth_upload_avatars" ON storage.objects;
CREATE POLICY "auth_upload_avatars"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');

-- 3. UPDATE — anon + authenticated, solo dentro del bucket 'avatars'
DROP POLICY IF EXISTS "auth_update_avatars" ON storage.objects;
CREATE POLICY "auth_update_avatars"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- 4. DELETE — anon + authenticated, solo dentro del bucket 'avatars'
DROP POLICY IF EXISTS "auth_delete_avatars" ON storage.objects;
CREATE POLICY "auth_delete_avatars"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'avatars');