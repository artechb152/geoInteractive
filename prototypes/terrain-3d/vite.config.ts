import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  css: {
    // An inline (empty) PostCSS config stops Vite from walking up to the host
    // site's postcss.config.mjs, which runs Tailwind with no config here and
    // prints the "`content` option is missing or empty" warning. This
    // prototype uses plain CSS only.
    postcss: {},
  },
  build: {
    // A single-page WebGL embed: three.js + R3F + drei + postprocessing are
    // the payload itself, so one ~1.4MB chunk is expected — raise the limit
    // so the build stays warning-free (same approach as pyramid-3-levels).
    chunkSizeWarningLimit: 1600,
  },
})
