import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

/**
 * שני הפלאגינים שבאמת חשובים כאן הם `react-hooks` ו-`jsx-a11y`: הרכיב נשען
 * על תלויות useEffect מדויקות, והנגישות היא דרישה מוצהרת של הקורס — ולא
 * משהו שנבדק ידנית פעם ברבעון.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      /* תוצר הבנייה של הספרייה. בלעדיו ה-lint בודק קוד מוקטן שנוצר אוטומטית
         ומדווח 198 בעיות שאיש לא יכול לתקן. */
      'dist-lib/**',
      'node_modules/**',
      'src/data/**',
      'tools/.cache/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      /**
       * אזהרה ולא שגיאה.
       *
       * הכלל מסמן כל `setState` בתוך אפקט, כולל שני דפוסים שהם הדרך הנכונה
       * לעשות את הדבר: מדידת DOM ב-`useLayoutEffect` ושמירת התוצאה במצב
       * (כך ממוקם כרטיס המידע לפי גבולות הצורה בפועל), וסנכרון אל מערכת
       * חיצונית — טיימר, זמינות Web Speech API, החלפת אזור בעורך התוכן.
       * ארבעת המופעים שנותרו כאן נבדקו אחד-אחד והם מכוונים. הכללים שמסמנים
       * שגיאות אמיתיות — גישה ל-ref בזמן רינדור וקריאה לא-טהורה בזמן
       * רינדור — נשארים ברמת error, ושם הם באמת תפסו באגים.
       */
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      /**
       * ה-SVG מכיל אלמנטים אינטראקטיביים (`role="button"` על `<path>`) שהם
       * מכוונים ונדרשים — המפה חייבת להיות נגישה למקלדת. הכלל הגנרי אינו
       * מכיר אלמנטי SVG ולכן היה מדווח שקר.
       */
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
    },
  },

  {
    files: ['tools/**/*.mjs', '*.config.{js,ts}', 'tools/**/*.js'],
    /**
     * גם Node וגם דפדפן: סקריפטי ה-pipeline רצים ב-Node, אבל חלקם מעבירים
     * פונקציות אל `page.evaluate()` — קוד שרץ **בתוך** הדפדפן ומשתמש ב-
     * `document`. בלי הגלובלים האלה ה-lint מדווח שגיאה על קוד תקין לחלוטין.
     */
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },

  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-console': 'off' },
  },

  prettier,
);
