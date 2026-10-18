import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const taskTemp = path.resolve('.playwright/tmp');
mkdirSync(taskTemp, { recursive: true });
const result = spawnSync(
  process.execPath,
  [path.resolve('node_modules/playwright/cli.js'), 'install', 'chromium'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: path.resolve('.playwright'),
      TMP: taskTemp,
      TEMP: taskTemp,
      TMPDIR: taskTemp,
    },
  },
);
process.exit(result.status ?? 1);
