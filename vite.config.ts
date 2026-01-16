import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/trpc': 'http://localhost:5174',
      '/ws': {
        target: 'http://localhost:5174',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
