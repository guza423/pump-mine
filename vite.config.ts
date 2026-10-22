import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'pump-mine';
const base = process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'PERFORMANCE',
        short_name: 'PERFORMANCE',
        description: 'Sunucusuz ve çevrimdışı kuvvet antrenmanı uygulaması',
        lang: 'tr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#04060c',
        theme_color: '#070b16',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}']
      }
    })
  ]
});
