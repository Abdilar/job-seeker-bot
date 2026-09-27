import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.integration.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.model.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 75,
        branches: 65,
      },
    },
  },
})
