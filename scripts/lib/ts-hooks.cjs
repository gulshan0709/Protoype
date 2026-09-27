// Lets node load the app's TypeScript sources the way Metro does: extensionless
// relative imports resolve to .ts/.tsx, and JSON files import as their default
// export. Use with `node --require ./scripts/lib/ts-hooks.cjs` or require() it
// before loading src/**/*.ts (e.g. src/domain/contracts/registry.ts).
const { registerHooks } = require("node:module");
const fs = require("node:fs");
const { fileURLToPath } = require("node:url");

if (!globalThis.__vizentaTsHooks) {
  globalThis.__vizentaTsHooks = true;
  registerHooks({
    resolve(spec, ctx, next) {
      if ((spec.startsWith(".") || spec.startsWith("/")) && !/\.\w+$/.test(spec)) {
        for (const ext of [".ts", ".tsx"]) {
          try {
            const r = next(spec + ext, ctx);
            if (fs.existsSync(fileURLToPath(r.url))) return r;
          } catch {}
        }
      }
      return next(spec, ctx);
    },
    load(url, ctx, next) {
      if (url.endsWith(".json"))
        return { format: "json", source: fs.readFileSync(fileURLToPath(url)), shortCircuit: true };
      return next(url, ctx);
    },
  });
}
