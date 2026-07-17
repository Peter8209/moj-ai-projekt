import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /**
   * Dočasná kompatibilná konfigurácia pre existujúci projekt ZEDPERA.
   *
   * Pravidlá zostávajú aktívne ako upozornenia tam, kde je to vhodné,
   * ale neblokujú lint, testovanie ani produkčný build.
   *
   * Táto konfigurácia nemení žiadnu funkcionalitu aplikácie.
   */
  {
    rules: {
      /**
       * Projekt obsahuje množstvo starších typov any.
       * Zachováme upozornenie, ale lint nebude ukončený chybou.
       */
      '@typescript-eslint/no-explicit-any': 'warn',

      /**
       * Nepoužité importy, premenné a pomocné funkcie zatiaľ iba zobrazíme
       * ako upozornenie.
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
       * let namiesto const nepredstavuje funkčnú chybu.
       */
      'prefer-const': 'warn',

      /**
       * Existujúci projekt načítava dáta a lokálne nastavenia v useEffect.
       * Refaktorovanie všetkých komponentov by bolo rozsiahle a mohlo by
       * zmeniť aktuálne správanie aplikácie.
       */
      'react-hooks/set-state-in-effect': 'off',

      /**
       * Starší kód obsahuje funkcie deklarované nižšie v komponente.
       * Kontrolu dočasne vypíname, aby sa zachovala existujúca funkcionalita.
       */
      'react-hooks/immutability': 'off',

      /**
       * Niektoré API route používajú názov module ako lokálnu premennú
       * alebo parameter. Ide o lint pravidlo Next.js, nie o TypeScript chybu.
       */
      '@next/next/no-assign-module-variable': 'off',
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
