// `npm start`: the local API (the Netlify Functions) and the Angular dev server together.
import { spawn } from 'node:child_process';

const run = (script) => spawn(`npm run ${script}`, { stdio: 'inherit', shell: true });
const children = [run('dev:api'), run('start:app')];

const stop = () => {
  for (const child of children) child.kill();
  process.exit();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) child.on('exit', stop);
