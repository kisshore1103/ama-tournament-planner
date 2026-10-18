import { spawnSync } from 'node:child_process';
import path from 'node:path';
const result = spawnSync(
  process.execPath,
  [path.resolve('node_modules/playwright/cli.js'), 'install', 'chromium'],
  {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.resolve('.playwright') },
  },
);
process.exit(result.status ?? 1);
