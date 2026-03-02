import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Vite plugin: copies project-root directories (data/, assets/) into dist/
 * after every production build.
 *
 * These directories live at the project root per the architecture spec and are
 * not inside Vite's default publicDir. During `vite dev` the dev-server already
 * serves all root files, so this plugin is only active during `vite build`.
 */
function copyStaticDirs(dirs: string[]): Plugin {
  return {
    name: 'copy-static-dirs',
    closeBundle() {
      for (const dir of dirs) {
        const src  = resolve(process.cwd(), dir);
        const dest = resolve(process.cwd(), 'dist', dir);
        if (existsSync(src)) {
          cpSync(src, dest, { recursive: true });
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [copyStaticDirs(['data', 'assets'])],
});
