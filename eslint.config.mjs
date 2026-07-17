import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /**
   * Kompatibilná konfigurácia pre existujúci projekt ZEDPERA.
   *
   * Pravidlá, ktoré upozorňujú na technický dlh, zostávajú aktívne
   * ako warnings, ale neblokujú TypeScript kontrolu ani produkčný build.
   */
  {
    rules: {
      /**
       * Staršie časti projektu používajú typ any.
       * Zatiaľ sa zobrazí upozornenie bez zablokovania testovania.
       */
      '@typescript-eslint/no-explicit-any': 'warn',

      /**
       * Nepoužité importy, premenné, argumenty a pomocné funkcie.
       */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      /**
       * Premenné, ktoré by mohli byť const.
       */
      'prefer-const': 'warn',

      /**
       * Existujúci projekt načítava lokálne nastavenia a dáta
       * prostredníctvom useEffect.
       */
      'react-hooks/set-state-in-effect': 'off',

      /**
       * Zachovanie existujúcich operácií s objektmi prehliadača,
       * navigáciou a pomocnými premennými.
       */
      'react-hooks/immutability': 'off',

      /**
       * Zachovanie existujúcich memoizovaných callbackov.
       */
      'react-hooks/preserve-manual-memoization': 'off',

      /**
       * Niektoré route používajú názov module ako lokálnu premennú.
       */
      '@next/next/no-assign-module-variable': 'off',
    },
  },

  /**
   * Súbory .cjs sú zámerne CommonJS skripty.
   * Používanie require() je v nich štandardné a funkčne správne.
   */
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
