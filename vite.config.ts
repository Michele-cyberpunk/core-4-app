
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Prioritize API_KEY if available (Gemini Studio default), fallback to GEMINI_API_KEY
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE'),
        'process.env.HUGGINGFACE_TOKEN': JSON.stringify(env.HUGGINGFACE_TOKEN || env.VITE_HUGGINGFACE_TOKEN || '')
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                return 'vendor';
              }
              if (id.includes('@google/genai')) {
                return 'genai';
              }
              if (id.includes('agent/computation')) {
                return 'consciousness';
              }
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': new URL('.', import.meta.url).pathname,
        }
      }
    };
});
