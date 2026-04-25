import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Backend host: in Docker the container is `backend`, on the host it's localhost.
    const backendUrl = env.VITE_BACKEND_URL || 'http://backend:8000';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api':           { target: backendUrl, changeOrigin: true },
          '/sanctum':       { target: backendUrl, changeOrigin: true },
          '/broadcasting':  { target: backendUrl, changeOrigin: true },
          '/storage':       { target: backendUrl, changeOrigin: true },
          '/up':            { target: backendUrl, changeOrigin: true },
        },
      },
      plugins: [react()],
      // Gemini key is no longer baked into the frontend bundle —
      // the React code calls /api/ai/* and the Laravel backend talks to Gemini server-side.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
