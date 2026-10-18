import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const path = 'userscripts/ama-sportdata-helper.user.js';
const text = readFileSync(path, 'utf8');
const forbidden = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bGM_xmlhttpRequest\b/,
  /\bWebSocket\b/,
  /document\.cookie/,
  /\bhistory\.(?:pushState|replaceState|back|forward|go)\s*\(/,
  /location\.(?:href|assign|replace)\s*(?:=|\()/,
  /window\.open\s*\(/,
];
for (const pattern of forbidden)
  if (pattern.test(text)) throw new Error(`Disallowed helper API: ${pattern}`);
const matches = [...text.matchAll(/^\/\/ @match (.+)$/gm)].map((m) => m[1]);
if (
  matches.length !== 2 ||
  !matches.includes('https://www.sportdata.org/*') ||
  !matches.includes('https://sportdata.org/*')
)
  throw new Error('Userscript host scope changed.');
if (
  text.includes('@connect') ||
  !text.includes('Capture Current Page') ||
  !text.includes('document.visibilityState')
)
  throw new Error('Missing explicit visible-page guard.');
const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  'Userscript syntax, host scope, explicit visibility guard and prohibited-API checks passed.',
);
