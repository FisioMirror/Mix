#!/bin/bash
echo "🔍 Verificando credenciales de Supabase..."
node scripts/check-env.cjs
echo "🚀 Iniciando aplicación..."
npm run dev
