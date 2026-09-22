const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist-pages");
const baseUrl = "/Protoype";
const cli = path.join(
  path.dirname(require.resolve("expo/package.json")),
  "bin/cli",
);
const build = spawnSync(
  process.execPath,
  [cli, "export", "--platform", "web", "--output-dir", output],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      VIZENTA_WEB_BASE_URL: baseUrl,
    },
  },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const index = path.join(output, "index.html");
const html = fs
  .readFileSync(index, "utf8")
  .replace('href="/favicon.svg"', `href="${baseUrl}/favicon.svg"`);
if (
  !html.includes(`${baseUrl}/_expo/`) ||
  !html.includes(`${baseUrl}/favicon.svg`)
) {
  throw new Error("The Pages build is missing the repository base path.");
}
fs.writeFileSync(index, html);
// Pages has no SPA rewrites: serve each auth entry point as a real HTML page.
for (const route of ["login", "register", "forgot-password"]) {
  const directory = path.join(output, route);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), html);
}
fs.writeFileSync(path.join(output, "404.html"), html);
fs.writeFileSync(path.join(output, ".nojekyll"), "");
console.log(`GitHub Pages build ready in dist-pages at ${baseUrl}/.`);
