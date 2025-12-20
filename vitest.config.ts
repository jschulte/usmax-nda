import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['src/test/setupEnv.ts'],
    globalSetup: ['src/test/globalSetup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
