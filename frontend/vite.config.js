import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Firebase Messaging owns the root service-worker registration.
      // Keep the installable manifest without registering a competing sw.js.
      injectRegister: null,
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['icons/logo-*.png'],
      manifest: {
        name: 'GrowNest Paper Products',
        short_name: 'GrowNest',
        description: 'GrowNest paper products shopping app',
        theme_color: '#176b45',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/logo-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/logo-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
  build: { outDir: 'dist', sourcemap: false },
})
