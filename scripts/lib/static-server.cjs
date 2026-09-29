// Serves a built web export (dist/ or dist-pages/) like its static host:
// `npm run preview` (serve.cjs) and the Pages and refresh checks use it.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
};

/**
 * The file under `root` for a request path below `prefix` (a directory means
 * its index.html); null when nothing is there, or the status to answer: 404
 * outside the prefix, 400 for a malformed path, 403 outside `root`.
 */
function resolveStatic(root, prefix, pathname) {
  if (!pathname.startsWith(prefix + "/")) return 404;
  let file;
  try {
    file = path.resolve(
      root,
      "." + decodeURIComponent(pathname.slice(prefix.length)),
    );
  } catch {
    return 400;
  }
  if (file !== root && !file.startsWith(root + path.sep)) return 403;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file = path.join(file, "index.html");
  return fs.existsSync(file) ? file : null;
}

/**
 * Serves `root` below `prefix` on 127.0.0.1 (`port` 0 picks a free one).
 * Missing paths get index.html (`spa`) or 404.html with status 404. `cache`
 * adds the deployment's Cache-Control headers. `onRequest(url, response)`
 * answers a request itself by returning true. Resolves to { base, close }.
 */
async function startStatic({
  root,
  prefix = "",
  port = 0,
  spa = true,
  cache = false,
  onRequest,
}) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (onRequest?.(url, response)) return;
    let file = resolveStatic(root, prefix, url.pathname);
    if (typeof file === "number") return response.writeHead(file).end();
    if (!file) {
      file = path.join(root, spa ? "index.html" : "404.html");
      if (!spa) response.statusCode = 404;
    }
    // HTML and the deployment marker must never reuse a stale response.
    // Expo's content-hashed assets can be cached safely across deployments.
    if (cache)
      response.setHeader(
        "Cache-Control",
        /[.-][a-f0-9]{32}\./i.test(path.basename(file))
          ? "public, max-age=31536000, immutable"
          : "no-store",
      );
    response.setHeader(
      "Content-Type",
      MIME[path.extname(file)] ?? "application/octet-stream",
    );
    const stream = fs.createReadStream(file);
    stream.on("error", () => {
      if (response.headersSent) return response.destroy();
      response.writeHead(503, {
        "Content-Type": "text/plain",
        "Retry-After": "1",
      });
      response.end("Preview is rebuilding. Refresh in a moment.");
    });
    stream.pipe(response);
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}${prefix}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

module.exports = { MIME, resolveStatic, startStatic };
