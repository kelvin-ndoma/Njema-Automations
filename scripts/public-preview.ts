import { spawn } from 'node:child_process';
// Deliberately unavailable database configuration: public rendering must not use it.
const child = spawn(
  'node_modules/node/bin/node',
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3101'],
  {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_BUILD_DIR: '.next-platform-tests',
      MONGODB_URI: 'mongodb://127.0.0.1:1',
      MONGODB_DB: '',
      BETTER_AUTH_SECRET: '',
      BETTER_AUTH_URL: 'http://127.0.0.1:3101',
    },
    stdio: 'inherit',
  },
);
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGTERM'));
child.on('exit', (code) => process.exit(code ?? 0));
