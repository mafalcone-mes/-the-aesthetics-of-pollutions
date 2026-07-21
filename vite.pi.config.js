import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      // Serve pi-index.html when hitting / in dev mode
      name: 'pi-root',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/') req.url = '/pi-index.html';
          next();
        });
      },
    },
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      input: 'pi-index.html',
    },
    outDir: 'raspberry-pi/dist',
    emptyOutDir: true,
  },
});
