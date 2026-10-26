import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { BASE_PATH } from './src/domain/deploy.ts';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  worker: { format: 'iife' },
});
