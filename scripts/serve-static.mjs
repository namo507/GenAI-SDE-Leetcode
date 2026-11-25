/** Local QA server for the exact exported artifact. No application backend. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const root = resolve("out");
const port = Number(process.env.PORT ?? 3100);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".wasm": "application/wasm", ".png": "image/png" };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const path = resolve(root, `.${pathname}`);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    for (const candidate of [path, join(path, "index.html"), `${path}.html`]) {
      if ((await stat(candidate).catch(() => null))?.isFile()) {
        response.writeHead(200, { "Content-Type": mime[extname(candidate)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
        response.end(await readFile(candidate)); return;
      }
    }
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(join(root, "404.html")));
  } catch { response.writeHead(400).end("Invalid request"); }
}).listen(port, "127.0.0.1", () => console.log(`Static preview: http://localhost:${port}`));
