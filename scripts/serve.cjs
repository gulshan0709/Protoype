const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
http
  .createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }
    const file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const selected =
      fs.existsSync(file) && fs.statSync(file).isFile()
        ? file
        : path.join(root, "index.html");
    // HTML and the deployment marker must never reuse a stale response.
    // Expo's content-hashed assets can be cached safely across deployments.
    response.setHeader(
      "Cache-Control",
      /[.-][a-f0-9]{32}\./i.test(path.basename(selected))
        ? "public, max-age=31536000, immutable"
        : "no-store",
    );
    response.setHeader(
      "Content-Type",
      types[path.extname(selected)] ?? "application/octet-stream",
    );
    const stream = fs.createReadStream(selected);
    stream.on("error", () => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(503, {
        "Content-Type": "text/plain",
        "Retry-After": "1",
      });
      response.end("Preview is rebuilding. Refresh in a moment.");
    });
    stream.pipe(response);
  })
  .listen(Number(process.env.PORT || 8082), "127.0.0.1", () =>
    console.log(
      `Vizenta AI preview: http://localhost:${process.env.PORT || 8082}`,
    ),
  );
