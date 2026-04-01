import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@tensorflow') || id.includes('recharts') || id.includes('framer-motion')) {
            return 'analytics-vendor';
          }
          if (id.includes('@lit-protocol')) return 'lit-vendor';
          if (id.includes('helia') || id.includes('libp2p')) return 'storage-vendor';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['helia', 'libp2p'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  define: {
    global: 'globalThis',
  },
  worker: {
    format: 'es',
  },
  esbuild: {
    target: 'esnext',
  },
  server: {
    port: 3000,
  },
});
