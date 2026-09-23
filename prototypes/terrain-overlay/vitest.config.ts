import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      /* `src/data` נוצר אוטומטית ואינו קוד שמישהו כותב — כיסוי עליו הוא מספר
         שמנפח את הממוצע בלי לומר דבר על איכות הבדיקות. */
      exclude: ['src/data/**', 'src/main.tsx', 'tools/**', '**/*.d.ts'],
    },
  },
});
