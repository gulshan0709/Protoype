// Serves the dist/ web export for `npm run preview` (PORT overrides 8082).
const path = require("node:path");
const { startStatic } = require("./lib/static-server.cjs");
const port = Number(process.env.PORT || 8082);
startStatic({
  root: path.resolve(__dirname, "../dist"),
  port,
  cache: true,
}).then(() => console.log(`Vizenta AI preview: http://localhost:${port}`));
