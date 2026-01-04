import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['src/test/setupEnv.ts', 'src/test/setup.ts'],
    globalSetup: ['src/test/globalSetup.ts'],
    environmentMatchGlobs: [['src/server/**', 'node']],
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
