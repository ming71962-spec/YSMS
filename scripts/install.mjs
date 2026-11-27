import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
const bundled = path.resolve(path.dirname(process.execPath), '../node_modules/pnpm/bin/pnpm.cjs');
const pnpm = process.env.SITES_PNPM_BIN || bundled;
const options = { stdio: 'inherit', env: process.env };
const result = existsSync(pnpm)
  ? spawnSync(process.execPath, [pnpm, 'install', '--frozen-lockfile'], options)
  : process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'pnpm install --frozen-lockfile'], options)
    : spawnSync('pnpm', ['install', '--frozen-lockfile'], options);
if (result.error) console.error('请安装 pnpm 11.25.0，或通过 SITES_PNPM_BIN 指定 pnpm.cjs。');
process.exit(result.status ?? 1);
