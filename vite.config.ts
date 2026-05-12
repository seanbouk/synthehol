import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev runs at root; prod builds for GitHub Pages at /synthehol/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/synthehol/' : '/',
  plugins: [react()],
  server: {
    port: 5173
  }
}));
