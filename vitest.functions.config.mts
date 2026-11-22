import { defineConfig } from 'vitest/config';

// The Netlify Functions and the build scripts run on Node, outside Angular's test builder.
export default defineConfig({
  test: {
    include: ['netlify/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    environment: 'node',
  },
});
