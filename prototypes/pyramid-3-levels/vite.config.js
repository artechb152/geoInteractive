import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' => relative asset paths so the build runs correctly inside an
// iframe / LMS page served from any sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  css: {
    // PostCSS ריק ומפורש — עוצר את Vite מלעלות לתיקיית האתר ולהריץ את
    // Tailwind שלו כאן (הפרוטוטייפ לא משתמש ב-Tailwind).
    postcss: {},
  },
  build: {
    // ספריית three נטענת בעצלתיים (chunk נפרד) — מעלים את סף האזהרה כדי
    // שהבנייה תהיה נקייה מאזהרת גודל chunk צפויה.
    chunkSizeWarningLimit: 1500,
  },
})
