import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev runs at root; prod builds for GitHub Pages at /synthehol/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/synthehol/' : '/',
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    // @grame/faustwasm constructs the AudioWorklet processor by string-
    // concatenating Class.toString() output, then loading the string via
    // a Blob URL. Minification renames classes/helpers in the main bundle
    // but those names don't exist in the worklet's separate scope —
    // produces "ReferenceError: fe is not defined" at runtime in prod.
    // Disabling minify is the safe fix for now. A later milestone will
    // pre-compile .dsp -> .wasm at build time and drop the runtime
    // Faust compiler entirely, removing this incompatibility along with
    // most of the bundle weight.
    minify: false
  }
}));
