/*
# Add 22 Clinical Fields to profiles for Patient Loading/OCR

## Purpose
This migration adds all the clinical and personal fields needed for the
patient loading wizard (OCR + manual + audio transcription). These fields
allow the fisioterapeuta to register a patient with complete clinical data
extracted from medical prescriptions via AI OCR, or entered manually.

## New Columns Added to `profiles`
1.  `documento_identidad` (text) — National ID / passport number
2.  `telefono` (text) — Patient phone number
3.  `tipo_sangre` (text) — Blood type (O+, O-, A+, A-, B+, B-, AB+, AB-)
4.  `ocupacion` (text) — Patient occupation/profession
5.  `nivel_actividad` (text) — Activity level (Sedentario, Moderado, Activo)
6.  `es_menor_edad` (boolean, default false) — Whether patient is a minor
7.  `patologia` (text) — Primary pathology/diagnosis
8.  `diagnostico_secundario` (text) — Secondary diagnosis
9.  `medicamentos_actuales` (text) — Current medications
10. `alergias` (text) — Allergies to medications
11. `enfermedades_cronicas` (text) — Chronic diseases / contraindications
12. `lesiones_previas` (text) — Previous injuries
13. `estatura_cm` (integer) — Height in centimeters
14. `peso_kg` (numeric) — Weight in kilograms (numeric for precision)
15. `extremidad_afectada` (text) — Affected limb
16. `rom_objetivo` (text) — Target range of motion
17. `frecuencia_sesiones` (text) — Session frequency
18. `medico_remitente` (text) — Referring physician name
19. `contacto_emergencia_nombre` (text) — Emergency contact name
20. `contacto_emergencia_telefono` (text) — Emergency contact phone
21. `tutor_nombre` (text) — Guardian name (if minor)
22. `tutor_telefono` (text) — Guardian phone (if minor)
23. `tutor_email` (text) — Guardian email (if minor)

## Existing Columns (already present, no changes)
- `fecha_nacimiento` (date) — Date of birth
- `diagnostico` (text) — Legacy diagnosis field (kept for backward compat)

## Security
- No RLS policy changes — existing policies on `profiles` remain unchanged.
- All new columns are nullable so existing rows are not affected.
*/