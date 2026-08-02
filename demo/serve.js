/* Static server for the demo.
 *
 * The demo imports the library as an ES module, which browsers refuse to do
 * over file://, so opening demo/index.html directly does not work. This serves
 * the repo root instead. No dependencies - it is the only way to run the demo
 * without asking anyone to install one.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  const target = path.endsWith('/') ? join(file, 'index.html') : file;
  try {
    const body = await readFile(target);
    response.writeHead(200, { 'content-type': TYPES[extname(target)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('not found');
  }
}).listen(port, () => {
  console.log(`demo: http://localhost:${port}/demo/`);
});
