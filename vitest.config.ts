import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.model.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})