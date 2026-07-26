import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The dev sandbox this was built in mounts the project folder in a way
    // that sometimes rejects deleting old dist/ files before a rebuild.
    // Not emptying the dir first avoids that; harmless for normal local/CI
    // builds too (just run `rm -rf dist` yourself first if you want a
    // fully clean output).
    emptyOutDir: false,
  },
});
