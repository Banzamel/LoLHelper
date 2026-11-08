// Vite: the main window (index.html) and the in-game widget (overlay.html) as two pages.
// Tauri serves the built files from dist/; in development `tauri dev` loads the dev server.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: { main: 'index.html', overlay: 'overlay.html' } },
  },
  test: { include: ['test/**/*.test.ts'] },
});
