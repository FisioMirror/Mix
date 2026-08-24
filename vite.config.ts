import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inyecta el service worker directamente en el HTML
      injectRegister: 'inline',
      includeAssets: [
        'favicon.ico',
        '64x64.png',
        '192x192.png',
        '512x512.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          // Datos de Supabase: primero red, luego caché (si no hay red)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          // Imágenes: primero caché, después red (rendimiento)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
            },
          },
          // Recursos estáticos: servir desde caché mientras se actualiza en segundo plano
          {
            urlPattern: /\.(?:js|css|woff2)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          // API genérica: primero red, si falla caché
          {
            urlPattern: /^https?.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 300 },
            },
          },
          // Páginas HTML: red primero, soporte offline
          {
            urlPattern: /\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 },
            },
          },
        ],
      },
      manifest: {
        name: 'FisioMirror',
        short_name: 'FisioMirror',
        description: 'Plataforma de tele-rehabilitación con análisis biomecánico en tiempo real y asistencia de IA.',
        // Identificador único y estable (no depende de la URL)
        id: 'fisiomirror-app-v1',
        start_url: '/',
        scope: '/',
        lang: 'es-VE',
        orientation: 'portrait-primary',
        display: 'standalone',
        // Modos de visualización avanzados
        display_override: [
          'standalone',
          'minimal-ui',
          'window-controls-overlay', // Superposición de controles de ventana
          'tabbed'                   // Pantalla con pestañas
        ],
        // Color de la barra de título (teal de la UI)
        theme_color: '#14b8a6',
        // Color del fondo del splash screen al abrir la app
        background_color: '#0f172a',
        categories: ['health', 'fitness', 'medical', 'utilities'],
        // Clasificación de edad (IARC)
        iarc_rating_id: '6+',
        prefer_related_applications: false,
        related_applications: [],
        // Atajos desde el icono de la app
        shortcuts: [
          {
            name: 'Iniciar ejercicio',
            short_name: 'Ejercicio',
            description: 'Ir directamente al modo espejo',
            url: '/ejercicios',
            icons: [{ src: '/192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Asistente IA',
            short_name: 'Asistente',
            description: 'Hablar con el asistente de fisioterapia',
            url: '/asistente',
            icons: [{ src: '/192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          { src: '/64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/192x192.png', sizes: '192x192', type: 'image/png' },
          {
            src: '/512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        // Protocolo personalizado web+fisiomirror
        protocol_handlers: [{ protocol: 'web+fisiomirror', url: '/%s' }],
        // Tipos de archivo que la app puede abrir
        file_handlers: [
          {
            action: '/',
            accept: {
              'application/pdf': '.pdf',
              'image/png': ['.png', '.jpg', '.jpeg', '.webp'],
              'audio/mpeg': ['.mp3', '.wav'],
              'video/mp4': ['.mp4', '.webm'],
            },
          },
        ],
        // Comportamiento al lanzar la app (enfocar instancia existente)
        launch_handler: { client_mode: 'focus-existing' },
        // Compartir contenido a la app
        share_target: {
          action: '/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'name',
            text: 'description',
            url: 'link',
            files: [
              {
                name: 'media',
                accept: ['image/*', 'audio/*', 'video/*', 'application/pdf'],
              },
            ],
          },
        },
        // Widgets (ejemplo de racha de ejercicios)
        widgets: [
          {
            name: 'Racha de ejercicios',
            tag: 'racha',
            ms_ac_template:
              "<div class='widget'><h3>Racha actual</h3><p>3 días</p></div>",
          },
        ],
        // Panel lateral en Edge
        edge_side_panel: {},
        // Toma de notas
        note_taking: { new_note_url: '/nueva-nota' },
      },
    }),
  ],
});
