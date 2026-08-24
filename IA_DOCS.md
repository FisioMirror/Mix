# Arquitectura de IA – FisioMirror (Definitiva)

## Sistema Actual

- **Backend:** Supabase Edge Functions (Deno)
- **Modelos principales:** Cloudflare Workers AI (LLaVA 1.5 para imágenes, Llama 3.1 8B para texto)
- **Fallback automático:** Cloudflare → Gemini → Hugging Face
- **Temperatura:** 0.2 (precisión alta, baja creatividad) en todos los modelos
- **Sistema de colas:** `ai_jobs` con polling (sin timeouts para el cliente)
- **Rate limiting:** 10 peticiones/minuto por IP

## Funciones Disponibles (hook `useAIJob`)

| Función | Descripción |
|---------|-------------|
| `analyzeImage(file, customPrompt?)` | Analiza documentos médicos y devuelve JSON estructurado |
| `generateText(userPrompt, systemPrompt?)` | Asistente, resúmenes de paciente/sesión |

## Cómo Usar

```typescript
const { analyzeImage, generateText, isLoading, error } = useAIJob();
const resultado = await analyzeImage(archivo); // imagen de receta
const consejo = await generateText("¿Ejercicios para lumbalgia?");
```

## Archivos Clave

- `/src/hooks/useAIJob.ts`
- `/supabase/functions/create-job/index.ts`
- `/supabase/functions/process-job/index.ts`
- `/supabase/functions/get-job/index.ts`

## Temperatura Actual: 0.2

- Si alucina, bajamos a 0.1
- Si las respuestas son muy rígidas, subimos a 0.4

## No Usar

- Tesseract ni modelos locales. Esta es la versión final.
