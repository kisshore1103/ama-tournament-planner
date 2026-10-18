import { spawnSync } from 'node:child_process';
import path from 'node:path';
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
    },
  },
);
process.exit(result.status ?? 1);
