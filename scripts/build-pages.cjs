const fs = require("node:fs");
const path = require("node:path");
const exportWeb = require("./export-web.cjs");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist-pages");
const baseUrl =
  process.env.VIZENTA_WEB_BASE_URL ??
  `/${process.env.GITHUB_REPOSITORY?.split("/")[1] || "Protoype"}`;
exportWeb(output, baseUrl);

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
