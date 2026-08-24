# FisioMirror v2.0 — Plataforma de Tele-Rehabilitación con IA

> **PWA** de tele-rehabilitación que conecta fisioterapeutas con pacientes mediante análisis biomecánico en tiempo real (cámara + MediaPipe), asistencia de IA para carga de pacientes, chat conversacional, generación de reportes clínicos en PDF, gamificación y modo offline.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
4. [Plano Maestro de la Aplicación](#plano-maestro-de-la-aplicación)
5. [Sistema de Autenticación](#sistema-de-autenticación)
6. [Roles y Flujos de Usuario](#roles-y-flujos-de-usuario)
7. [Modo Espejo AR](#modo-espejo-ar)
8. [Sistema de IA](#sistema-de-ia)
9. [Base de Datos (Supabase)](#base-de-datos-supabase)
10. [Edge Functions](#edge-functions)
11. [Sistema de Diseño](#sistema-de-diseño)
12. [Componentes UI](#componentes-ui)
13. [PWA y Offline](#pwa-y-offline)
14. [Gamificación](#gamificación)
15. [Notificaciones](#notificaciones)
16. [Estado Actual](#estado-actual)
17. [Problemas Conocidos](#problemas-conocidos)
18. [Guía para Continuar el Proyecto](#guía-para-continuar-el-proyecto)

---

## Visión General

FisioMirror es una plataforma web instalable (PWA) diseñada para fisioterapeutas y sus pacientes. El fisioterapeuta gestiona su directorio de pacientes, crea rutinas de ejercicios, genera tokens de acceso y utiliza IA para extraer datos clínicos de documentos (OCR). El paciente accede con un token, visualiza su rutina, ejecuta ejercicios guiados por cámara (modo espejo AR con detección de pose), chatea con un asistente IA y celebra logros.

### Pantallas principales

| Rol | Pantalla | Ruta | Descripción |
|-----|----------|------|-------------|
| Común | Login | `/login` | Acceso dual: fisioterapeuta (email/password) o paciente (token de 6 dígitos) |
| Común | Reset Password | `/reset-password` | Recuperación de contraseña vía Supabase Auth |
| Fisio | Dashboard | `/dashboard-fisio` | KPIs, insights IA, prioridades del día, acciones rápidas |
| Fisio | Directorio de Pacientes | `/patients` | Lista filtrable de pacientes con búsqueda y estadísticas |
| Fisio | Expediente de Paciente | `/paciente/:id` | Detalle completo: sesiones, rutina, métricas, notas |
| Fisio | Carga con IA (OCR) | `/ocr-scanner` | Flujo de 4 pasos: archivos → validar → rutina → finalizar |
| Fisio | Gestión de Tokens | `/tokens` | Generar, asignar, regenerar y eliminar tokens |
| Fisio | Biblioteca de Ejercicios | `/fisio-exercises` | CRUD completo de ejercicios con filtros |
| Fisio | Estadísticas | `/fisio-stats` | Gráficos de adherencia, dolor, ROM, distribución |
| Fisio | Herramientas IA | `/tools` | OCR rápido, IMC, resúmenes, exportación PDF |
| Fisio | Perfil | `/fisio-profile` | Datos profesionales, especialidades, credenciales |
| Fisio | Configuración | `/fisio-settings` | Tema, accesibilidad, notificaciones |
| Paciente | Dashboard | `/dashboard-paciente` | Racha, sesiones, rutina, calendario, logros |
| Paciente | Ejercicios | `/exercises` | Rutina asignada con instrucciones y demostraciones |
| Paciente | Modo Espejo AR | `/ar-mirror` | Sesión en vivo con cámara, rep counting, voz |
| Paciente | Calibración | `/calibration` | Calibración biomecánica pre-sesión |
| Paciente | Estadísticas | `/stats` | Progreso personal, gráficos |
| Paciente | Asistente IA | `/ai-assistant` | Chat con Physi (texto, voz, imágenes) |
| Paciente | Perfil | `/profile` | Datos personales, contacto del terapeuta |
| Paciente | Configuración | `/settings` | Tema, accesibilidad, instalación PWA |

---

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| **React** | ^18.3.1 | Framework UI |
| **TypeScript** | ^5.5.3 | Tipado estático |
| **Vite** | ^5.4.2 | Bundler + dev server |
| **Tailwind CSS** | ^3.4.1 | Estilos utility-first con tokens Material Design 3 |
| **Framer Motion** | ^12.42.0 | Animaciones, transiciones, micro-interacciones |
| **lucide-react** | ^0.344.0 | Iconografía |
| **Supabase** (`@supabase/supabase-js`) | ^2.57.4 | Backend: PostgreSQL, Storage, Edge Functions, Realtime |
| **Recharts** | ^3.10.1 | Gráficos en dashboards y estadísticas |
| **jsPDF** | ^4.2.1 | Generación de PDFs clínicos |
| **html2canvas** | ^1.4.1 | Render HTML→imagen para PDFs con IA |
| **react-hot-toast** | ^2.6.0 | Notificaciones toast |
| **vite-plugin-pwa** | ^1.3.0 | PWA: manifest, service worker, runtime caching |
| **zustand** | ^5.0.14 | Estado global (auth) con persistencia en localStorage |
| **react-router-dom** | ^6.30.4 | Routing con lazy loading |
| **canvas-confetti** | ^1.9.4 | Celebración de logros y sesiones |
| **three** | ^0.185.1 | Modelos 3D para demostraciones de ejercicios |
| **@number-flow/react** | ^0.6.1 | Animación de números en KPIs |
| **i18next + react-i18next** | ^26.4.0 / ^17.0.12 | Infraestructura multilingüe (preparada, español activo) |
| **clsx + tailwind-merge** | ^2.1.1 / ^3.6.0 | Utilidad `cn()` para clases condicionales |

### Scripts

```bash
npm run dev          # Servidor de desarrollo (Vite)
npm run build        # Build de producción (verifica env + compila)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run preview      # Preview del build
```

---

## Arquitectura del Proyecto

```
fisiomirror/
├── src/
│   ├── components/
│   │   ├── ui/                      # 53+ componentes UI reutilizables
│   │   │   ├── AILoader.tsx         # Loader animado "Generando" para procesos IA
│   │   │   ├── AnimatedCircularProgressBar.tsx
│   │   │   ├── AnimatedCountdown.tsx
│   │   │   ├── AnimatedList.tsx     # Lista con reveal secuencial spring
│   │   │   ├── AnimatedTabs.tsx    # Tabs con indicador deslizante
│   │   │   ├── AuroraText.tsx       # Texto con gradiente aurora animado
│   │   │   ├── BorderBeam.tsx      # Haz de luz que recorre el borde
│   │   │   ├── ChatMessages.tsx     # Chat animado con auto-play y typing
│   │   │   ├── CollapsibleSection.tsx
│   │   │   ├── CommandPalette.tsx   # ⌘K palette de comandos
│   │   │   ├── ConfettiButton.tsx   # Botón que dispara confeti
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── FloatingMenu.tsx     # FAB con acciones expandibles
│   │   │   ├── Glass.tsx            # GlassPanel, GlassCard (glassmorphism)
│   │   │   ├── GlassModal.tsx       # Modal con backdrop blur
│   │   │   ├── GlassToast.tsx       # Sistema de toasts con swipe
│   │   │   ├── HelpGuideButton.tsx  # Botón de FAQ contextual por ruta
│   │   │   ├── HyperText.tsx        # Texto con efecto scramble on hover
│   │   │   ├── LightRays.tsx         # Rayos de luz animados de fondo
│   │   │   ├── Loader.tsx           # Spinner, DotLoader, BarLoader, etc.
│   │   │   ├── MascotAnimation.tsx  # Mascota Physi (.webp animada)
│   │   │   ├── Particles.tsx        # Campo de partículas + spotlight
│   │   │   ├── PDFExportModal.tsx
│   │   │   ├── PhysiGuide.tsx       # Burbuja flotante de chat (FAQ offline)
│   │   │   ├── PinInput.tsx         # Input de PIN de 6 dígitos
│   │   │   ├── PremiumSkeleton.tsx
│   │   │   ├── ShineBorder.tsx      # Borde brillante animado
│   │   │   ├── SimpleCalendar.tsx
│   │   │   ├── TextAnimate.tsx      # Reveal de texto por palabra/carácter
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── TypewriterText.tsx
│   │   │   ├── TypingAnimation.tsx
│   │   │   └── ... (53 componentes total)
│   │   ├── micro/                   # Microinteracciones (DeleteAnimation, OtpFold, etc.)
│   │   ├── characters3d/            # Modelos 3D (KidModel3D, PhysioModel3D)
│   │   ├── rehabilitation/          # SkeletonDemo (demo biomecánica)
│   │   ├── auth/                    # SparkleEffect
│   │   ├── FisioLayout.tsx          # Layout fisio: sidebar, header, notificaciones
│   │   ├── PatientLayout.tsx        # Layout paciente: nav inferior, header, FAB contacto
│   │   ├── ProtectedRoute.tsx       # Guard de rutas por rol
│   │   ├── SplashScreen.tsx         # Splash con logo + dots de carga
│   │   ├── OnboardingTour.tsx        # Tour guiado para nuevos usuarios
│   │   ├── ReassignRoutineModal.tsx # Modal de reasignación de rutinas
│   │   ├── AchievementShowcase.tsx  # Showcase de logros desbloqueados
│   │   └── OfflineIndicator.tsx
│   ├── pages/                       # 17 páginas (lazy-loaded)
│   ├── context/
│   │   ├── ThemeContext.tsx         # Modo claro/oscuro con persistencia
│   │   └── NotificationContext.tsx  # Notificaciones Realtime + sonido
│   ├── hooks/
│   │   ├── usePoseDetection.ts      # MediaPipe Pose: cámara, landmarks, ángulos
│   │   ├── useGamification.ts       # Logros, rachas, sesiones (localStorage)
│   │   ├── useOfflineExercises.ts   # Carga offline desde IndexedDB
│   │   ├── useAccessibility.ts      # Preferencias de accesibilidad
│   │   └── useLoadingMessages.ts    # Mensajes rotatorios de carga
│   ├── lib/
│   │   ├── supabase.ts              # Cliente Supabase (anon key, sin sesión persistente)
│   │   ├── auth.ts                  # Hash SHA-256 + salt, generador de tokens
│   │   ├── ai.ts                    # Sistema de jobs IA (create→poll→get)
│   │   ├── pdfExport.ts             # PDF simple + PDF con IA
│   │   ├── formatReport.tsx         # Formateo de respuestas IA
│   │   ├── confetti.ts              # Celebraciones (logros, sesiones)
│   │   ├── offlineDB.ts             # IndexedDB para rutinas offline
│   │   ├── installContext.tsx       # PWA beforeinstallprompt
│   │   └── utils.ts                 # cn() y utilidades
│   ├── stores/
│   │   └── authStore.ts             # Zustand: login, registro, token, sesión (7 días)
│   ├── data/
│   │   ├── exercisePresets.ts       # Biblioteca de ejercicios predefinidos
│   │   ├── exerciseImages.ts        # URLs de imágenes de ejercicios
│   │   └── physiFAQs.ts             # Base de conocimiento del asistente Physi
│   ├── types/
│   │   ├── index.ts                 # Profile, Ejercicio, Rutina, SesionCompletada, etc.
│   │   └── character.types.ts       # Tipos de personajes 3D
│   ├── config/
│   │   └── supabase-fallback.ts     # Credenciales de respaldo
│   ├── i18n/
│   │   └── index.ts                 # Configuración i18next (es activo)
│   ├── styles/
│   │   └── globals.css              # Tokens de color, animaciones CSS, glassmorphism
│   ├── App.tsx                      # Router principal con lazy loading + ProtectedRoute
│   └── main.tsx                     # Entry point
├── public/
│   ├── icons/                       # Iconos PWA (64, 192, 512)
│   ├── animations/mascot/           # 10 animaciones .webp de mascota Physi
│   └── logo.svg, logo.png
├── supabase/
│   ├── migrations/                  # ~40 migraciones SQL (esquema, RLS, RPC, storage, seed)
│   └── functions/                   # 16 Edge Functions (Deno)
├── api/                             # API routes de Vercel (proxy a Edge Functions)
│   ├── create-job.js
│   ├── get-job.js
│   ├── process-job.js
│   ├── ocr-prescripcion.js
│   └── transcribe-audio.js
├── .design-ref/                     # ~30 mockups HTML de diseño (desktop + móvil)
├── IA_DOCS.md                       # Documentación de arquitectura de IA
├── vite.config.ts                  # Vite + PWA (manifest completo, runtime caching)
├── tailwind.config.ts               # Sistema de tokens Material Design 3
├── vercel.json                      # Config de deploy
└── package.json
```

---

## Plano Maestro de la Aplicación

### Diagrama de Flujo Conceptual

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FISIOMIRROR v2.0                            │
│                     PWA de Tele-Rehabilitación                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     LOGIN      ┌──────────────────────────────┐   │
│  │  SplashScreen │──────────────▶│         Login.tsx            │   │
│  │  (2.2s)      │               │  Fisio: email + password      │   │
│  └──────────────┘               │  Paciente: token 6 dígitos    │   │
│                                 └──────────┬───────────────────┘   │
│                                            │                        │
│                         ┌──────────────────┼──────────────────┐    │
│                         │                   │                  │    │
│                  FISIOTERAPEUTA          PACIENTE              │    │
│                         │                   │                  │    │
│  ┌──────────────────────┴──┐    ┌───────────┴──────────────┐   │    │
│  │   FisioLayout           │    │   PatientLayout          │   │    │
│  │   (sidebar + header)    │    │   (nav inferior + FAB)   │   │    │
│  └──────────┬──────────────┘    └──────────┬────────────────┘   │    │
│             │                              │                     │    │
│  ┌──────────┴──────────────────┐  ┌────────┴────────────────┐  │    │
│  │ DashboardFisio             │  │ PatientDashboard        │  │    │
│  │  - KPIs en tiempo real     │  │  - Racha de días        │  │    │
│  │  - Insights IA             │  │  - Sesiones totales     │  │    │
│  │  - Prioridades del día     │  │  - Rutina asignada      │  │    │
│  │  - Acciones rápidas        │  │  - Calendario           │  │    │
│  ├────────────────────────────┤  │  - Logros (gamificación)│  │    │
│  │ PatientsPage               │  ├─────────────────────────┤  │    │
│  │  - Directorio filtrable    │  │ PatientExercisesPage   │  │    │
│  ├────────────────────────────┤  │  - Ejercicios asignados │  │    │
│  │ PatientDetailPage          │  ├─────────────────────────┤  │    │
│  │  - Expediente completo     │  │ ARMirrorPage            │  │    │
│  ├────────────────────────────┤  │  - MediaPipe Pose       │  │    │
│  │ OCRScannerPage (4 pasos)   │  │  - Rep counting         │  │    │
│  │  - Cargar archivos         │  │  - Voz en español       │  │    │
│  │  - Validar con IA          │  │  - Reporte post-sesión  │  │    │
│  │  - Configurar rutina       │  ├─────────────────────────┤  │    │
│  │  - Generar token           │  │ AIAssistantPage         │  │    │
│  ├────────────────────────────┤  │  - Chat con Physi       │  │    │
│  │ TokenGeneratorPage        │  │  - Voz + imágenes       │  │    │
│  │ ExercisesPage (CRUD)       │  ├─────────────────────────┤  │    │
│  │ StatsPage (gráficos)       │  │ StatsPage (progreso)    │  │    │
│  │ ToolsPage (IA tools)       │  │ ProfilePage             │  │    │
│  │ ProfilePage                │  │ SettingsPage             │  │    │
│  │ SettingsPage               │  └─────────────────────────┘  │    │
│  └────────────────────────────┘                                 │    │
│                                                                  │    │
│  ┌──────────────────────────────────────────────────────────┐   │    │
│  │              COMPONENTES TRANSVERSALES                   │   │    │
│  │  PhysiGuide (FAQ flotante)  │  HelpGuideButton (FAQ)     │   │    │
│  │  FloatingMenu (FAB)         │  OnboardingTour            │   │    │
│  │  OfflineIndicator          │  InstallModal (PWA)        │   │    │
│  │  CommandPalette (⌘K)        │  ErrorBoundary             │   │    │
│  │  NotificationContext (RT)  │  ThemeContext (dark/light) │   │    │
│  └──────────────────────────────────────────────────────────┘   │    │
└─────────────────────────────────────────────────────────────────┘    │
                                                                       │
                    ┌──────────────────────────────────┐              │
                    │         SUPABASE BACKEND          │              │
                    ├──────────────────────────────────┤              │
                    │  PostgreSQL (RLS habilitada)     │              │
                    │  Storage (buckets: avatars,       │              │
                    │    credenciales, mascot, pwa)     │              │
                    │  Edge Functions (16, Deno)        │              │
                    │  Realtime (notifications channel) │              │
                    └──────────────────────────────────┘              │
```

### Flujo de Autenticación

```
Usuario abre la app
    │
    ▼
SplashScreen (2.2s) ──▶ initialize() authStore
    │                         │
    │                    ¿Hay sesión en localStorage?
    │                         │
    │              ┌──── Sí ──┴── No ────┐
    │              │                     │
    │              ▼                     ▼
    │     ¿Expiró (7 días)?        Login.tsx
    │         │                    │
    │    ┌─── ┴ ─── ┐              │
    │    Sí        No              │
    │    │         │              │
    │    ▼         ▼              │
    │  Login   RoleRedirect        │
    │           │                  │
    │     fisioterapeuta?──▶ /dashboard-fisio
    │     paciente?──────▶ /dashboard-paciente
    │
    └─▶ Login.tsx
         │
         ├─ Fisioterapeuta: email + password
         │    └─▶ POST /functions/v1/auth-login
         │         └─▶ Valida hash en servidor
         │              └─▶ Devuelve user_id
         │                   └─▶ fetchProfileById()
         │                        └─▶ Set user en Zustand
         │
         ├─ Paciente: token 6 dígitos
         │    └─▶ Query activation_tokens en Supabase
         │         └─▶ Vincula paciente_id → profile
         │              └─▶ Set user en Zustand
         │
         └─ Registro fisio (2 pasos):
              Paso 1: datos + credenciales
              Paso 2: universidad, colegiado, especialidades
              └─▶ POST /functions/v1/auth-register
                   └─▶ Crea profile + hash password
```

### Flujo de IA (Jobs)

```
Frontend (ai.ts)
    │
    ├─▶ createAIJob(type, input)
    │    └─▶ POST /api/create-job
    │         └─▶ Inserta en ai_jobs (status: pending)
    │              └─▶ Devuelve job_id
    │
    ├─▶ pollAIJob(jobId, timeout=120s)
    │    └─▶ GET /api/get-job?job_id=X (cada 2.5s)
    │         └─▶ ¿status === completed? → return result
    │         └─▶ ¿status === failed? → return error
    │
    └─▶ process-job (Edge Function, invocada por trigger o cron)
         └─▶ Lee job pending de ai_jobs
              ├─▶ Cloudflare Workers AI (LLaVA / Llama 3.1)
              ├─▶ Fallback: Gemini 2.5 Flash
              └─▶ Fallback: Hugging Face (Qwen / Llama)
              └─▶ Update ai_jobs con resultado
```

### Flujo del Modo Espejo AR

```
CalibrationPage
    │
    ├─▶ Solicita cámara (getUserMedia)
    ├─▶ MediaPipe Pose (modelComplexity: 2)
    ├─▶ Detecta landmarks → calcula ángulos basales
    └─▶ Guarda calibración

ARMirrorPage
    │
    ├─▶ Inicia cámara + MediaPipe Pose
    ├─▶ Loop de detección (33 landmarks, 30fps):
    │    ├─▶ Filtro promedio móvil (5 frames)
    │    ├─▶ Suavizado exponencial
    │    ├─▶ Cálculo de ángulos en tiempo real
    │    ├─▶ Color coding: verde (±5°), amarillo (±15°), rojo (>15°)
    │    ├─▶ Rep counting por detección de fase
    │    ├─▶ Detección de compensaciones
    │    └─▶ Feedback de voz (Web Speech API, español)
    │
    ├─▶ Estructura: 3 series × 15 reps, descanso 15s
    ├─▶ Confeti al completar todas las series
    └─▶ Reporte post-sesión:
         ├─▶ Dolor antes/después (escala 1-10)
         ├─▶ Nivel de fatiga
         ├─▶ Comentario libre
         └─▶ Persiste en sesiones_completadas + post_session_reports
```

---

## Sistema de Autenticación

### Fisioterapeuta
- **Login:** email + password → POST a Edge Function `auth-login` (validación server-side con hash SHA-256 + salt).
- **Registro:** 2 pasos. Paso 1: datos personales + credenciales. Paso 2: universidad, colegiado, especialidades, año de egreso, upload de credencial a Storage. → POST a `auth-register`.
- **Sesión persistente:** localStorage con expiración de 7 días (zustand persist).
- **Rate limiting:** 5 intentos fallidos → cooldown de 15 minutos (manejado en Edge Function).

### Paciente
- **Login:** token de 6 dígitos → query directa a `activation_tokens` en Supabase.
- El token se vincula a un `paciente_id` → carga el `profile` del paciente.
- Token reutilizable (no se marca como usado en el flujo actual).

### Guard de Rutas
- `ProtectedRoute` verifica `user.role` y redirige:
  - `fisioterapeuta` → rutas bajo `FisioLayout`
  - `paciente` → rutas bajo `PatientLayout`
  - Sin sesión → `/login`

### Notas de Seguridad
- El hash de contraseña se valida en Edge Functions (server-side), no en el cliente.
- El salt está en el servidor (Edge Function), no hardcoded en el cliente.
- El cliente Supabase usa `anon key` con `persistSession: false` y `autoRefreshToken: false`.
- RLS está habilitada en todas las tablas.

---

## Roles y Flujos de Usuario

### Fisioterapeuta

1. **Dashboard:** KPIs en tiempo real (pacientes activos, sesiones de hoy, adherencia semanal, tokens pendientes). Banner de insights generados por IA. Lista de prioridades con código de urgencia. Paleta de comandos (⌘K).
2. **Directorio de Pacientes:** Lista filtrable con búsqueda, tarjetas con avatar, estado, adherencia, última sesión.
3. **Expediente de Paciente:** Sesiones completadas, rutinas activas/archivadas, métricas de progreso, notas, documentos clínicos.
4. **Carga con IA (OCR Scanner):** Flujo de 4 pasos:
   - Paso 1: Cargar hasta 10 archivos (imágenes, PDFs, audio, video) con drag & drop.
   - Paso 2: IA extrae datos (nombre, email, diagnóstico, ROM, medicamentos, etc.) → validar/editar.
   - Paso 3: Configurar rutina seleccionando ejercicios de la biblioteca.
   - Paso 4: Finalizar → crea perfil + vincula terapeuta + genera token.
5. **Gestión de Tokens:** Generar, asignar, regenerar, eliminar. Filtros por estado. Copiar al portapapeles. Envío por email.
6. **Biblioteca de Ejercicios:** CRUD completo. Campos: nombre, descripción, articulación, grupo muscular, series, repeticiones, duración, ángulo objetivo, fase de recuperación, lado, categoría.
7. **Estadísticas:** Gráficos Recharts de adherencia, dolor, ROM, distribución de ejercicios, sesiones por diagnóstico.
8. **Herramientas IA:** OCR rápido, calculadora IMC, resúmenes de sesión/paciente, exportación PDF.
9. **Perfil:** Datos profesionales, especialidades, credenciales, clínica.
10. **Reasignación de Rutinas:** Modal con flujo de selección de ejercicios, configuración de series/repeticiones, archiva rutina anterior.

### Paciente

1. **Dashboard:** Racha de días, sesiones totales, minutos semanales, gráfico de barras de actividad, calendario con sesiones marcadas, rutina asignada, datos del terapeuta, logros.
2. **Ejercicios:** Rutina asignada con instrucciones, demostraciones (modelo 3D o imagen), series/repeticiones.
3. **Modo Espejo AR:** Sesión en vivo con cámara, detección de pose, rep counting, guía de voz, reporte post-sesión.
4. **Calibración:** Ajuste de ángulos basales antes de sesión AR.
5. **Asistente IA:** Chat con Physi (texto, voz, imágenes). Contexto personalizado: perfil, últimas 5 sesiones, ejercicios, racha.
6. **Estadísticas:** Progreso personal con gráficos.
7. **Perfil:** Datos personales, contacto del terapeuta (tel, WhatsApp, SMS, videollamada).
8. **Configuración:** Tema claro/oscuro, tamaño de fuente, instrucciones de instalación PWA (iOS).

---

## Modo Espejo AR

El componente central de rehabilitación. Usa **MediaPipe Pose** (`modelComplexity: 2`) para detección de 33 landmarks en tiempo real.

### Características técnicas
- **Filtrado:** promedio móvil de 5 frames + suavizado exponencial.
- **Ángulos calculados:** hombros, codos, caderas, rodillas, tobillos.
- **Color coding del esqueleto:** verde (±5° del objetivo), amarillo (±15°), rojo (>15°).
- **Rep counting:** automático por detección de fase (arriba/abajo del brazo).
- **Compensaciones detectadas:** cadera desalineada, hombros desalineados, torso inclinado.
- **Guía de voz:** Web Speech API en español con feedback en tiempo real.
- **Estructura de sesión:** 3 series × 15 reps, descansos de 15s entre series.
- **Reporte post-sesión:** dolor antes/después, fatiga, comentario → persiste en `sesiones_completadas` + `post_session_reports`.
- **Confeti** al completar todas las series.

### Dependencia crítica
MediaPipe se carga desde CDN (`cdn.jsdelivr.net`). Si el CDN falla, la sesión AR no inicia. No hay fallback offline.

---

## Sistema de IA

### Arquitectura de Jobs
El sistema de IA usa un patrón de cola asíncrona: el frontend crea un job, hace polling hasta que se completa, y obtiene el resultado.

```
runAIJob(type, input) → createAIJob → POST /api/create-job
                                         │
                                    ai_jobs (pending)
                                         │
                                    process-job (Edge Function)
                                    ├─▶ Cloudflare Workers AI
                                    ├─▶ Gemini 2.5 Flash (fallback)
                                    └─▶ Hugging Face (fallback)
                                         │
                                    ai_jobs (completed/failed)
                                         │
pollAIJob(jobId) → GET /api/get-job ←─────┘
                    (cada 2.5s, timeout 120s)
```

### Modelos de IA disponibles
| Proveedor | Modelo | Uso |
|-----------|--------|-----|
| Cloudflare | LLaVA 1.5 7B | Análisis de imágenes |
| Cloudflare | Llama 3.1 8B | Generación de texto |
| Cloudflare | Whisper Large v3 Turbo | Transcripción de audio |
| Gemini | 2.5 Flash / Flash-lite | Fallback imágenes + texto |
| Groq | Llama 3.2 90B Vision | Fallback OCR |
| Hugging Face | Qwen2-VL 7B / Llama 3.2 11B Vision | Fallback final |

### Funciones del hook de IA
- `analyzeImage(file, customPrompt?)` — Analiza documentos médicos → JSON estructurado.
- `generateText(userPrompt, systemPrompt?)` — Asistente, resúmenes.
- `transcribeAudio(audioBase64)` — Speech-to-text.
- `ocrUpdatePatient(image, patientId)` — OCR + update de paciente.

### Rate Limiting
10 peticiones/minuto por IP. Si se excede, devuelve HTTP 429.

### Secrets configurados en Supabase
`GEMINI_API_KEY`, `GEMINI_API_KEY2`, `GROQ_API_KEY2`, `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_API_TOKEN2`, `CF_ACCOUNT_ID2`, `HF_API_TOKEN`, `HF_API_TOKEN2`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

> **Importante:** No usar `tesseract.js` ni `@xenova/transformers`. Ver `IA_DOCS.md`.

---

## Base de Datos (Supabase)

### Tablas principales

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Usuarios (fisioterapeutas y pacientes). Campos clínicos, contacto, tutor (menores). |
| `pacientes` | Datos específicos de pacientes vinculados a un terapeuta. |
| `activation_tokens` | Tokens de 6 dígitos para acceso de pacientes. Vinculados a `paciente_id` y `terapeuta_id`. |
| `rutinas` | Rutinas de ejercicios asignadas a pacientes. Campo `activa` para distinguir vigentes de archivadas. |
| `exercises` | Biblioteca de ejercicios del fisioterapeuta. |
| `patient_exercises` | Relación paciente-ejercicio (ejercicios asignados). |
| `sesiones_completadas` | Registro de cada sesión completada por un paciente. |
| `post_session_reports` | Reportes post-sesión (dolor, fatiga, notas). |
| `ai_jobs` | Cola de trabajos de IA (status: pending/completed/failed). |
| `ai_conversations` | Historial de chat con el asistente IA. |
| `notifications` | Notificaciones del sistema (videollamada, rutina, sistema). |
| `documentos_clinicos` | Documentos escaneados con OCR. |
| `logros` | Definiciones de logros de gamificación. |
| `especialidades` | Especialidades de fisioterapia (catálogo). |
| `profile_especialidades` | Relación perfil-especialidad. |

### RLS (Row Level Security)
RLS está habilitada en todas las tablas. Las políticas siguen el patrón:
- `SELECT`: el usuario ve sus propios datos (por `auth.uid()` o `terapeuta_id`).
- `INSERT`: el usuario puede insertar datos propios.
- `UPDATE`: el dueño o `service_role`.
- `DELETE`: el dueño o `service_role`.

### Storage Buckets
| Bucket | Propósito | Acceso |
|--------|-----------|--------|
| `avatars` | Avatares de usuario | Público lectura, autenticado escritura |
| `credenciales` | Credenciales de fisioterapeutas | Privado |
| `mascot` | Animaciones de mascota (.webp) | Público lectura |
| `pwa-icons` | Iconos PWA personalizados | Público |

### Migraciones
~40 migraciones en `supabase/migrations/`. Cubren: creación de esquema, RLS, funciones RPC, storage buckets, seed de datos demo, correcciones de seguridad.

---

## Edge Functions

16 Edge Functions en `supabase/functions/` (Deno runtime):

| Función | Propósito |
|---------|-----------|
| `auth-login` | Autenticación de fisioterapeutas (hash server-side) |
| `auth-register` | Registro de fisioterapeutas |
| `auth-activate` | Activación de cuentas |
| `auth-validate` | Validación de tokens de paciente |
| `auth-user` | Obtener usuario actual |
| `auth-update-password` | Actualización de contraseña |
| `auth-delete-account` | Eliminación de cuenta |
| `create-job` | Crear job de IA en cola |
| `process-job` | Procesar job (Cloudflare → Gemini → HuggingFace) |
| `get-job` | Consultar estado de job |
| `get-job-status` | Consultar estado alternativo |
| `gemini-ocr` | OCR directo con Gemini |
| `ocr-prescripcion` | OCR de prescripciones médicas |
| `FisioMirror_Asistent_AI` | Asistente IA conversacional |
| `transcribe-audio` | Speech-to-text (Whisper) |
| `send-notification` | Envío de notificaciones push |

### API Routes (Vercel)
Los archivos en `api/` son proxies de Vercel que reenvían a las Edge Functions de Supabase:
- `create-job.js` → `create-job`
- `get-job.js` → `get-job`
- `process-job.js` → `process-job`
- `ocr-prescripcion.js` → `ocr-prescripcion`
- `transcribe-audio.js` → `transcribe-audio`

### CORS
Todas las Edge Functions incluyen headers CORS:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

---

## Sistema de Diseño

### Filosofía
- **Material Design 3** con tokens semánticos (CSS variables que cambian automáticamente en modo oscuro).
- **Glassmorphism** en toda la interfaz (`glass-panel`, `backdrop-blur`, `bg-opacity`).
- **Paleta:** Teal/cyan como primario, azul como secundario, verde lima como acento cinético. **No se usan colores púrpura/violeta/rosa.**
- **Tipografía:** Montserrat (sans), Playfair Display (serif/display), JetBrains Mono (mono).
- **Espaciado:** Sistema de 8px (xs=8, sm=16, md=24, lg=40, xl=64).
- **Animaciones:** Framer Motion para transiciones, hover states, micro-interacciones. CSS animations para loops ambientales (breathe, shimmer, pulse-glow, float).

### Tokens de color (CSS variables)
Definidos en `src/styles/globals.css` y mapeados en `tailwind.config.ts`:
- `--c-primary` / `--c-on-primary` / `--c-primary-container` (teal)
- `--c-secondary` (azul)
- `--c-tertiary` (verde lima)
- `--c-surface` / `--c-surface-container-*` (fondos)
- `--c-on-surface` / `--c-on-surface-variant` (texto)
- `--c-error` / `--c-warning` / `--c-success` (estados)
- `--c-outline` / `--c-outline-variant` (bordes)

### Gradientes definidos
`gradient-brand`, `gradient-primary`, `gradient-accent`, `gradient-kinetic`, `gradient-blue-azure`, `gradient-terracotta`, `gradient-teal-lime`, `gradient-editorial`, `gradient-mesh` (sutil y oscuro).

### Gradientes de texto
`gradient-text-editorial`, `gradient-text-teal`, `gradient-text-living`, `gradient-text-flow`, `gradient-text-blue`, `gradient-text-lime`. Todos usan paleta teal/azul/lima — ninguno usa púrpura.

---

## Componentes UI

### Catálogo (53+ componentes en `src/components/ui/`)

#### Componentes de animación (Magic UI / 21st Dev)
| Componente | Descripción |
|-----------|-------------|
| `AuroraText` | Texto con gradiente aurora animado |
| `BorderBeam` | Haz de luz que recorre el borde de un elemento |
| `ShineBorder` | Brillo que barre el borde continuamente |
| `LightRays` | Rayos de luz animados como fondo ambiental |
| `Particles` | Campo de partículas + spotlight + separador gradiente |
| `TextAnimate` | Reveal de texto por palabra o carácter (fade, blur, slide, scale) |
| `TypingAnimation` | Efecto máquina de escribir con loop y cursor |
| `TypewriterText` | Typewriter con velocidad configurable |
| `ShimmerText` | Texto con barrido shimmer |
| `AnimatedList` | Lista con reveal secuencial spring |
| `AnimatedCircularProgressBar` | Anillo de progreso SVG animado |
| `AnimatedCountdown` | Cuenta regresiva con NumberFlow |
| `AnimatedTabs` | Tabs con indicador deslizante |
| `AnimatedLink` | Link con underline + flecha animada en hover |
| `HyperText` | Texto con efecto scramble al pasar el mouse |
| `AILoader` | Loader "Generando" con letras rebotando + barra de progreso |
| `ChatMessages` | Chat animado con auto-play, typing indicator, replay |
| `ConfettiButton` | Botón que dispara confeti al hacer clic |
| `ProgressiveBlur` | Desenfoque progresivo en bordes |

#### Componentes estructurales
| Componente | Descripción |
|-----------|-------------|
| `Glass` | GlassPanel, GlassCard (glassmorphism) |
| `GlassModal` | Modal con backdrop blur, tamaños sm/md/lg/full |
| `GlassToast` | Sistema de toasts con swipe-to-dismiss |
| `CollapsibleSection` | Sección colapsable con chevron rotativo |
| `CollapsibleProfile` | Tarjeta de perfil colapsable |
| `FloatingMenu` | FAB con acciones expandibles escalonadas |
| `CommandPalette` | ⌘K palette de comandos con búsqueda filtrada |
| `ErrorBoundary` | Boundary con mascota + botón de recarga |
| `EmptyState` | Estado vacío con icono/título/mensaje específicos |
| `PremiumSkeleton` | Skeletons premium para KPIs y listas |

#### Componentes funcionales
| Componente | Descripción |
|-----------|-------------|
| `PhysiGuide` | Burbuja flotante de chat con FAQ offline (keyword matching) |
| `HelpGuideButton` | Botón de FAQ contextual según la ruta actual |
| `MascotAnimation` | Mascota Physi renderizada desde .webp |
| `PinInput` / `TokenInput` | Inputs de PIN/token con auto-advance |
| `PDFExportModal` | Modal de exportación a PDF |
| `InstallPrompt` | Modal de instalación PWA |
| `LegalModal` | Modal de documentos legales |
| `MultiSelect` | Multi-select con chips |
| `SimpleCalendar` | Calendario con fechas marcadas |
| `WaveformVisualizer` | Visualizador de forma de onda de audio |
| `Tooltip` | Tooltip posicional |
| `Toggle` | Switch con label/descripción |
| `ThemeToggle` | Toggle de modo claro/oscuro |

#### Microinteracciones (`src/components/micro/`)
`DeleteAnimation`, `DragDropRetry`, `EyesLookAway`, `LiquidTab`, `OrbitAndScrew`, `OtpFold`, `RingToBar`, `TabLight`.

#### Modelos 3D (`src/components/characters3d/`)
`KidModel3D`, `PhysioModel3D` — modelos 3D con Three.js para demostraciones de ejercicios. Usados en `SkeletonDemo.tsx`.

### Mascota Physi
10 animaciones `.webp` en `public/animations/mascot/`:
`saludo`, `idle`, `cargando`, `consejo`, `despedida`, `error`, `escaneando`, `exito`, `notificacion`, `racha`.

---

## PWA y Offline

### Manifest (`vite.config.ts`)
- **Nombre:** FisioMirror
- **Display:** standalone (con override: minimal-ui, window-controls-overlay, tabbed)
- **Categorías:** health, fitness, medical, utilities
- **Atajos:** "Iniciar ejercicio" → `/ejercicios`, "Asistente IA" → `/asistente`
- **File handlers:** PDF, imágenes, audio, video
- **Share target:** Recibe imágenes, audio, video, PDF
- **Protocol handler:** `web+fisiomirror`
- **Widgets:** Racha de ejercicios
- **Edge side panel** + **Note taking**

### Service Worker (Workbox)
| Patrón | Estrategia | Cache |
|--------|-----------|-------|
| Supabase API | NetworkFirst | supabase-cache (50 entries, 24h) |
| Imágenes | CacheFirst | image-cache (100 entries, 7 días) |
| JS/CSS/Woff2 | StaleWhileRevalidate | static-resources (50 entries, 24h) |
| API genérica | NetworkFirst | api-cache (20 entries, 5 min) |
| HTML | NetworkFirst | html-cache (10 entries, 1h) |

### Offline (IndexedDB)
- `src/lib/offlineDB.ts` — guarda rutina activa y ejercicios en IndexedDB.
- `useOfflineExercises` hook — carga ejercicios desde IndexedDB cuando no hay conexión.
- `OfflineIndicator` — banner visual cuando no hay conexión.
- Al recuperar conexión, sincroniza con Supabase.

---

## Gamificación

### Sistema de Logros (`useGamification.ts`)
Los logros se persisten en `localStorage` (clave: `fisiomirror-achievements`).

| Logro | Tier | Condición |
|-------|------|-----------|
| Primer Paso | Bronce | Completar 1 sesión |
| Constancia | Plata | Completar 3 sesiones |
| Dedicación | Oro | Completar 5 sesiones |
| Guerrero de la Recuperación | Diamante | Completar 10 sesiones |
| Racha de 3 Días | Bronce | Practicar 3 días seguidos |
| Racha de 7 Días | Oro | Practicar 7 días seguidos |
| Forma Perfecta | Plata | Alcanzar rango óptimo en un ejercicio |
| Lechuza Nocturna | Bronce | Sesión después de 8 PM |
| Madrugador | Bronce | Sesión antes de 7 AM |
| Explorador | Oro | Practicar todos los ejercicios asignados |

### Funciones del hook
- `recordSession()` — incrementa contadores de sesiones.
- `recordStreak(days)` — actualiza rachas.
- `unlockSpecial(id)` — desbloquea logro especial.
- `unlockedCount` — total de logros desbloqueados.
- `totalProgress` — progreso global (0-1).

### Onboarding
- `OnboardingTour` — tour guiado para nuevos usuarios.
- `hasCompletedOnboarding()` / `markOnboardingComplete()` — persistencia en localStorage.

### Celebración
- `confetti.ts` dispara `canvas-confetti` al desbloquear logros o completar sesiones.

---

## Notificaciones

### Sistema (`NotificationContext.tsx`)
- Campana con contador de no leídas en el header.
- Suscripción en tiempo real vía **Supabase Realtime** (channel `postgres_changes` en tabla `notifications`).
- Tipos: `videollamada`, `rutina`, `sistema`, `recordatorio`.
- Marcar como leídas individualmente o todas a la vez.
- **Sonido:** Web Audio API con tonos diferenciados por tipo.
- **Vibración** en móvil.

### Videollamada
Integración con **Jitsi Meet** — links abiertos en nueva pestaña desde notificaciones.

---

## Estado Actual

### Funciona correctamente
- Autenticación dual (fisioterapeuta con email/password vía Edge Function, paciente con token).
- Registro de fisioterapeutas en 2 pasos con upload de credencial.
- Dashboards de ambos roles con KPIs reales desde Supabase.
- Biblioteca de ejercicios con CRUD completo.
- Generación y gestión de tokens.
- Sistema de notificaciones con tiempo real.
- Modo oscuro/claro con persistencia.
- PWA instalable con manifest y service worker.
- Exportación de PDF simple y con IA.
- Chat con asistente IA (texto, voz, imágenes).
- Carga de pacientes con IA (OCR, 4 pasos).
- Celebraciones con confetti.
- Gamificación con logros en localStorage.
- Modo offline con IndexedDB.
- Modelos 3D para demostraciones de ejercicios.
- Mascota Physi animada (.webp).
- FAQ contextual por ruta (PhysiGuide + HelpGuideButton).
- Paleta de comandos (⌘K).
- Reasignación de rutinas con archivado.
- Indicador offline.
- Instrucciones de instalación PWA para iOS.

### En progreso / Pendiente
- **MediaPipe Holistic:** Selector de modelo AR (Automático/Pose/Holistic) en Configuración.
- **i18n completo:** Infraestructura instalada, solo español activo. Falta traducir textos.
- **Exportación a Google Calendar:** Componente pendiente de integrar.
- **SEO:** Meta tags, sitemap.xml y página 404 personalizada pendientes.
- **Informe semanal automático (cron):** Tabla y Edge Function pendientes.
- **Recordatorios configurables:** Tabla y Edge Function pendientes.
- **Análisis clínico avanzado (mesetas/abandono):** Edge Function pendiente.
- **Token de un solo uso + email/password para paciente:** Flujo pendiente de migración.

---

## Problemas Conocidos

1. **MediaPipe desde CDN:** Si `cdn.jsdelivr.net` falla, la sesión AR no inicia. No hay timeout ni fallback offline.
2. **Grabación de audio en OCR:** El audio se graba con `MediaRecorder` pero la transcripción requiere backend (solo se usa Web Speech API en el chat).
3. **Videollamada Jitsi:** Solo abre un link externo; no hay videollamada embebida.
4. **Sin tests:** No hay suite de tests configurada.
5. **Dependencias potencialmente no usadas:** Verificar y limpiar `package.json` periódicamente.

---

## Guía para Continuar el Proyecto

### Reglas de oro
1. **Lee este README completo primero.** Es el documento de contexto más actualizado.
2. **Revisa `package.json`** antes de asumir que una librería está instalada.
3. **No dupliques componentes.** Antes de crear uno nuevo, busca en `src/components/ui/` (53+ componentes).
4. **Usa el sistema de tokens de Tailwind** (`text-on-surface`, `bg-surface-container`, `text-primary`). No hardcodees colores hex.
5. **Para IA, usa `runAIJob()` desde `src/lib/ai.ts`.** No uses Tesseract ni modelos locales. Lee `IA_DOCS.md`.
6. **Para Supabase, usa el cliente en `src/lib/supabase.ts`.** Para DDL, usa `apply_migration` (MCP). Para DML, usa `execute_sql` (MCP).
7. **Después de cada cambio, ejecuta `npm run build`** para verificar que compila.
8. **Para verificar UI,** usa el dev server (corre automáticamente) y prueba en el navegador.
9. **Mantén `.design-ref/`** como referencia visual — contiene mockups HTML de casi todas las pantallas.
10. **No uses colores púrpura/violeta/rosa.** La paleta es teal/azul/lima.
11. **Todo el texto debe estar en español** (excepto términos médicos universalmente aceptados).
12. **Usa Framer Motion** para animaciones, no CSS animations cuando Framer puede hacerlo mejor.
13. **Usa HeroUI** (`@heroui/react`) como base para UI components cuando sea posible.
14. **Usa Lucide React y Tabler Icons** para toda la iconografía.
15. **RLS siempre habilitada** en cada tabla nueva. 4 políticas (una por verbo CRUD), nunca `FOR ALL`.

### Estructura de carpetas
- `src/components/ui/` — componentes UI reutilizables
- `src/components/` — componentes de layout y feature
- `src/pages/` — páginas (lazy-loaded)
- `src/lib/` — lógica de negocio (supabase, auth, ai, pdf, etc.)
- `src/stores/` — estado global (zustand)
- `src/hooks/` — hooks custom
- `src/context/` — contextos de React (theme, notifications)
- `src/types/` — tipos TypeScript
- `src/data/` — datos estáticos (presets, FAQs, imágenes)
- `supabase/migrations/` — migraciones SQL
- `supabase/functions/` — Edge Functions (Deno)
- `api/` — proxies de Vercel a Edge Functions

### Convenciones de código
- Importar todo lo que se referencia (componentes, iconos, hooks, tipos).
- Tipar explícitamente todos los parámetros de funciones.
- No usar `any` implícito.
- Comentarios: solo el "por qué" cuando no es obvio. No explicar el "qué".
- No dejar código muerto, exports huérfanos, ni comentarios de código eliminado.

### Paleta de colores de referencia
Los archivos `Paleta Modo Claro.md` y `Paleta Modo Oscuro.md` (mencionados por el usuario) no existen físicamente en el proyecto. Las paletas están aplicadas directamente en:
- `src/styles/globals.css` — CSS variables para modo claro y oscuro
- `tailwind.config.ts` — mapeo de tokens a clases de Tailwind

### Credenciales
Las credenciales de Supabase están en `.env` y `src/config/supabase-fallback.ts`. No se deben hardcodear ni exponer en el frontend. El cliente usa `anon key` (no `service_role`).
