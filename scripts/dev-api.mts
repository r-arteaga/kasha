// Runs the Netlify Functions locally on http://localhost:8888, so `ng serve` (proxy.conf.json) can reach /api
// without the Netlify CLI. Same handlers as production; only the routing is done here.
import { createServer } from 'node:http';
import tts from '../netlify/functions/tts.mts';
import voices from '../netlify/functions/voices.mts';

const routes: Record<string, (request: Request) => Promise<Response>> = {
  '/api/tts': tts,
  '/api/voices': () => voices(),
};

const PORT = 8888;

createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url ?? '/', `http://localhost:${PORT}`);
  const handler = routes[url.pathname];
  if (!handler) {
    outgoing.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) chunks.push(chunk as Buffer);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  const request = new Request(url, { method: incoming.method, headers: incoming.headers as HeadersInit, body });

  const started = Date.now();
  const response = await handler(request);
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
  console.log(`${incoming.method} ${url.pathname} → ${response.status} (${Date.now() - started} ms)`);
}).listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
