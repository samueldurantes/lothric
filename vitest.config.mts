import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./test/setup-file.ts'],
    include: ['**/*.test.ts'],
    environment: 'node',
  },
  plugins: [tsconfigPaths()],
});
