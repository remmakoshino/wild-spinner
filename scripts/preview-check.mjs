import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const port = 4173;
const previewUrl = `http://${host}:${port}/wild-spinner/`;

const previewProc = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--', '--host', host, '--port', String(port)],
  {
    stdio: ['ignore', 'pipe', 'pipe']
  }
);

let previewLog = '';
previewProc.stdout.on('data', (chunk) => {
  previewLog += chunk.toString();
});
previewProc.stderr.on('data', (chunk) => {
  previewLog += chunk.toString();
});

const shutdown = async () => {
  if (previewProc.killed) return;
  previewProc.kill('SIGTERM');
  await delay(300);
  if (!previewProc.killed) {
    previewProc.kill('SIGKILL');
  }
};

try {
  let ok = false;

  for (let i = 0; i < 25; i += 1) {
    await delay(400);

    try {
      const res = await fetch(previewUrl, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) {
        ok = true;
        break;
      }
    } catch {
      // Preview起動待ち中は無視する
    }
  }

  if (!ok) {
    throw new Error(`preview URL check failed: ${previewUrl}\n${previewLog}`);
  }

  console.log(`preview check ok: ${previewUrl}`);
} catch (error) {
  console.error(String(error));
  await shutdown();
  process.exit(1);
}

await shutdown();
