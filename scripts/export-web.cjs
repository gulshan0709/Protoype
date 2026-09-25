const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

module.exports = function exportWeb(output, baseUrl = "") {
  const root = path.resolve(__dirname, "..");
  const id = randomUUID();
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
        EXPO_PUBLIC_VIZENTA_BASE_URL: baseUrl,
        EXPO_PUBLIC_VIZENTA_BUILD_ID: id,
      },
    },
  );
  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status ?? 1);
  fs.writeFileSync(path.join(output, "version.json"), JSON.stringify({ id }));
};
if (require.main === module) module.exports(path.resolve(__dirname, "../dist"));
