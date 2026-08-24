# Guía Avanzada de Supabase — FisioMirror

## Arquitectura General

FisioMirror usa Supabase como backend completo: autenticación, base de datos (PostgreSQL), almacenamiento de archivos, Edge Functions (Deno) y notificaciones en tiempo real (Realtime).

### Esquema de Conexión

```
Frontend (React)
  ├── @supabase/supabase-js (cliente anónimo)
  ├── Realtime (WebSocket — cambios en tablas)
  └── Edge Functions (REST — lógica sensible)
        ├── Cloudflare Workers AI (IA)
        ├── Gemini (fallback IA)
        └── Storage (credenciales, avatares, iconos PWA)
```

---

## Autenticación Personalizada

FisioMirror **no** usa Supabase Auth nativo. Implementa autenticación propia con tablas `usuarios` y `tokens_paciente`.

### Flujo de Login

1. **Fisioterapeuta:** email + contraseña → Edge Function `auth-login` → valida credenciales en `usuarios` → devuelve JWT personalizado.
2. **Paciente:** token de 6 dígitos → Edge Function `auth-validate` → valida token en `tokens_paciente` → devuelve sesión.

### Edge Functions de Auth

| Función | Propósito |
|---------|-----------|
| `auth-register` | Registra fisioterapeuta (con validación pendiente) |
| `auth-login` | Login de fisioterapeuta |
| `auth-validate` | Valida token de paciente |
| `auth-activate` | Activa cuenta de fisioterapeuta (admin) |
| `auth-user` | Obtiene datos del usuario autenticado |
| `auth-update-password` | Cambia contraseña |
| `auth-delete-account` | Elimina cuenta |
| `patient-activate` | Activa paciente con token de un solo uso |

### Tokens de Paciente

- Los tokens son de **6 dígitos**, reutilizables por defecto.
- El token demo `123456` está vinculado a un paciente de prueba.
- Para tokens de un solo uso, usar `patient-activate` que marca el token como usado tras el primer login.

---

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Las políticas usan `auth.uid()` de Supabase Auth nativo (no el JWT personalizado) porque el cliente de Supabase se inicializa con la clave anónima.

### Patrón Estándar de Políticas

```sql
-- SELECT: el usuario solo ve sus propios registros
CREATE POLICY "select_own" ON <tabla>
  TO authenticated USING (auth.uid() = user_id);

-- INSERT: el usuario solo inserta sus propios registros
CREATE POLICY "insert_own" ON <tabla>
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- UPDATE: el usuario solo actualiza sus propios registros
CREATE POLICY "update_own" ON <tabla>
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: el usuario solo elimina sus propios registros
CREATE POLICY "delete_own" ON <tabla>
  TO authenticated USING (auth.uid() = user_id);
```

### Tablas con Acceso Anónimo

Para tablas que el cliente anónimo necesita leer (ej. `especialidades`), usar `TO anon, authenticated` con `USING (true)` solo para SELECT.

---

## Tablas Principales

### Clínicas

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Perfil de usuario (fisioterapeuta o paciente) con datos clínicos |
| `fisioterapeutas_simple` | Datos profesionales del fisioterapeuta (teléfono, cédula, etc.) |
| `pacientes_terapeutas` | Relación paciente ↔ fisioterapeuta |
| `tokens_paciente` | Tokens de acceso de pacientes |
| `rutinas` | Rutinas asignadas (activas/archivadas) |
| `patient_exercises` | Ejercicios individuales asignados a un paciente |
| `sesiones_completadas` | Registro de sesiones AR completadas |
| `post_session_reports` | Reportes post-sesión con análisis |
| `notifications` | Notificaciones del sistema |
| `ai_jobs` | Cola de trabajos de IA |
| `ai_conversations` | Historial de conversaciones con Physi |
| `logros` | Logros desbloqueados por gamificación |
| `documentos_clinicos` | Documentos médicos escaneados (OCR) |

### Storage

| Bucket | Propósito |
|--------|-----------|
| `credenciales_profesionales` | PDFs/imágenes de credenciales de fisioterapeutas |
| `avatars` | Fotos de perfil |
| `pwa-icons` | Iconos de la PWA |
| `mascot-animations` | Animaciones webp de la mascota |

---

## Edge Functions

### CORS Obligatorio

Toda Edge Function debe incluir estos headers en cada respuesta:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

if (req.method === "OPTIONS") {
  return new Response(null, { status: 200, headers: corsHeaders });
}
```

### Funciones de IA

| Función | Modelo | Propósito |
|---------|--------|-----------|
| `create-job` | — | Crea trabajo en cola `ai_jobs` |
| `process-job` | Cloudflare Workers AI | Procesa trabajo (LLaVA / Llama 3.1) |
| `get-job` / `get-job-status` | — | Consulta estado del trabajo |
| `gemini-ocr` | Gemini Vision | OCR de documentos médicos (fallback) |
| `ocr-prescripcion` | — | Extrae datos de prescripciones |
| `FisioMirror_Asistent_AI` | — | Chatbot Physi |

### Funciones de Notificaciones

| Función | Propósito |
|---------|-----------|
| `send-notification` | Inserta notificación en `notifications` |
| `enviar-recordatorios` | Cron: envía recordatorios de sesión |
| `generar-informe-semanal` | Cron: genera informe semanal del paciente |

### Funciones Clínicas

| Función | Propósito |
|---------|-----------|
| `analizar-progreso` | Análisis clínico avanzado del progreso del paciente |
| `transcribe-audio` | Transcripción de notas de voz |

---

## Sistema de Colas de IA

Para evitar timeouts del cliente, las peticiones de IA usan un sistema de colas:

1. El cliente llama a `create-job` con el tipo de trabajo.
2. `process-job` procesa el trabajo asíncronamente.
3. El cliente hace polling a `get-job` hasta que el estado sea `completed`.

### Rate Limiting

- 10 peticiones/minuto por IP.
- Implementado en la tabla `rate_limits`.

---

## Realtime

FisioMirror usa Realtime para notificaciones instantáneas:

```typescript
const channel = supabase
  .channel('patient-notifications')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => handleNotification(payload)
  )
  .subscribe();
```

**Importante:** Siempre incluir polling fallback cada 30s, ya que Realtime puede perder eventos.

---

## Migraciones

Las migraciones están en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_descripcion.sql`.

### Reglas de Migración

- **NUNCA** usar `DROP` o `DELETE` en columnas con datos de usuario.
- **NUNCA** cambiar tipos de columnas existentes (perdería datos).
- **NUNCA** renombrar tablas.
- Usar `ALTER TABLE ... ADD COLUMN` para nuevos campos.
- Habilitar RLS en toda tabla nueva: `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
- Crear 4 políticas por tabla (SELECT, INSERT, UPDATE, DELETE) — nunca `FOR ALL`.

---

## Manejo de Errores en el Cliente

```typescript
const { data, error } = await supabase
  .from('tabla')
  .select('*')
  .eq('user_id', userId);

if (error) {
  // Mostrar error al usuario, no silenciar
  toast.error('Error: ' + error.message);
  return;
}

if (!data || data.length === 0) {
  // Estado vacío explícito
  setShowEmptyState(true);
  return;
}
```

### `maybeSingle()` vs `single()`

- Usar `maybeSingle()` cuando el registro puede no existir (devuelve `null` sin error).
- Usar `single()` solo cuando el registro **debe** existir (lanza error si no).

---

## Variables de Entorno

Las credenciales de Supabase están preconfiguradas en `.env`:

- `VITE_SUPABASE_URL` — URL del proyecto
- `VITE_SUPABASE_ANON_KEY` — Clave anónima (pública)
- `SUPABASE_SERVICE_ROLE_KEY` — Clave de servicio (solo servidor, nunca en el frontend)

**NUNCA** exponer la service role key en el código del cliente.
