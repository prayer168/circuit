import { defineConfig } from 'vite';
import { cp } from 'node:fs/promises';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'copy-lesson-data',
    async closeBundle() {
      await Promise.all([
        cp('data', 'dist/data', { recursive: true }),
        cp('docs', 'dist/docs', { recursive: true })
      ]);
    }
  }]
});

