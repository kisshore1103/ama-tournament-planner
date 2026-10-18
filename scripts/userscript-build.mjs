import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
const entry = 'lib/capture/helper.ts';
if (!existsSync(entry)) {
  console.log('Capture helper will be added in phase 2.');
  process.exit(0);
}
const banner = `// ==UserScript==\n// @name AMA SportData Capture Helper\n// @namespace https://ama-tatami-planner.local\n// @version 1.0.1\n// @description Explicit visible-page capture for AMA Tatami Planner\n// @match https://www.sportdata.org/*\n// @match https://sportdata.org/*\n// @grant GM_getValue\n// @grant GM_setValue\n// @grant GM_deleteValue\n// @run-at document-idle\n// ==/UserScript==`;
const result = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  minify: true,
  banner: { js: banner },
  alias: { '@': '.' },
  define: {
    'process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE': '"America/Toronto"',
    'process.env.NEXT_PUBLIC_DEFAULT_AUTO_REFRESH_SECONDS': '"45"',
  },
});
mkdirSync('userscripts', { recursive: true });
writeFileSync('userscripts/ama-sportdata-helper.user.js', result.outputFiles[0].text);
writeFileSync('public/ama-sportdata-helper.user.js', result.outputFiles[0].text);
