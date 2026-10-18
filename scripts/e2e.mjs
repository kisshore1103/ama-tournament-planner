import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const taskTemp = path.resolve('.playwright/tmp');
mkdirSync(taskTemp, { recursive: true });
const result = spawnSync(
  process.execPath,
  [path.resolve('node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: path.resolve('.playwright'),
      AMA_E2E_STORE: '1',
      NEXT_TELEMETRY_DISABLED: '1',
      TMP: taskTemp,
      TEMP: taskTemp,
      TMPDIR: taskTemp,
    },
  },
);
process.exit(result.status ?? 1);
