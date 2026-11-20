import { defineConfig } from 'vitest/config';

// The Netlify Functions run on Node, outside Angular's test builder.
export default defineConfig({
  test: {
    include: ['netlify/**/*.spec.ts'],
    environment: 'node',
  },
});
