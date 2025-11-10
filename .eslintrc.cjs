/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es2022: true,
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier', 'plugin:storybook/recommended'],
  ignorePatterns: ['dist/**', 'coverage/**', 'node_modules/**'],
  overrides: [
    {
      files: ['apps/client/**/*.{ts,tsx}'],
      env: {
        browser: true,
        node: false,
      },
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        // Design System Enforcement Rules
        'no-restricted-syntax': [
          'error',
          {
            selector: 'ImportDeclaration[source.value=/\\.css$/]',
            message: 'CSS file imports are not allowed. Use design system primitives from @workspace/ui instead.',
          },
          {
            selector: 'JSXAttribute[name.name="style"]',
            message: 'Inline styles are not allowed. Use design system props or CSS variables instead.',
          },
        ],
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/components/ui', '**/components/ui/*', './ui', './ui/*', '../ui', '../ui/*'],
                message: 'Do not create UI components in apps/client/src/components/ui/. All design system components must live in packages/ui/ and be imported from @workspace/ui. See Constitution Principle IX (Design Library First).',
              },
            ],
          },
        ],
      },
    },
    {
      // Exemption for Storybook stories - allow inline styles for demonstrations
      files: ['**/*.stories.tsx'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
