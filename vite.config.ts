import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const base = process.env.VITE_BASE_PATH || '/';
export default defineConfig({base,plugins:[react(),VitePWA({registerType:'prompt',includeAssets:['icon.svg','icon-192.png','icon-512.png'],manifest:{name:'MediGuide BD',short_name:'MediGuide',description:'Understand your prescribed medicine in English and Bangla.',theme_color:'#126e64',background_color:'#f7faf9',display:'standalone',start_url:base,scope:base,icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},workbox:{navigateFallback:'index.html',globPatterns:['**/*.{js,css,html,png,svg,json}']}})],test:{environment:'jsdom',setupFiles:['./src/test/setup.ts'],include:['src/**/*.test.{ts,tsx}']}});
