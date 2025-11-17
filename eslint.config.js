import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist'] },
  // 直接包含推荐的 JS 配置（应用于所有文件）
  js.configs.recommended,
  // JS/JSX 文件配置
  {
    files: ['**/*.{js,jsx}'],
    // 在 flat config 中，直接展开配置对象而不是使用 extends
    ...reactHooks.configs['recommended-latest'],
    ...reactRefresh.configs.vite,
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node, // 添加 Node.js 全局变量（用于 scripts 目录）
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...reactRefresh.configs.vite.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // TypeScript 文件配置（只应用于 src 目录下的 .ts/.tsx 文件）
  // 注意：recommendedTypeChecked 需要类型信息，只应用于 tsconfig.json 中包含的文件
  ...tseslint.configs.recommendedTypeChecked.map(config => ({
    ...config,
    files: ['src/**/*.{ts,tsx}'], // 只检查 src 目录下的文件
  })),
  {
    files: ['src/**/*.{ts,tsx}'], // 只检查 src 目录下的文件
    // 在 flat config 中，直接展开配置对象而不是使用 extends
    ...reactHooks.configs['recommended-latest'],
    ...reactRefresh.configs.vite,
    languageOptions: {
      parserOptions: {
        projectService: true,
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: globals.browser,
    },
    rules: {
      ...reactRefresh.configs.vite.rules,
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]
