// Merge the curated portrait manifests into the pool and, optionally, re-download the files.
// Usage: node scripts/prepare-demo-portraits.cjs [--download]
// Reads scripts/portraits/*.json (one per group, see assets/profiles/README.md) and writes
// src/shared/people/portraitPool.json with credits. --download refetches every
// assets/profiles/people/<id>.jpg (1080x1080) and thumbs/<id>.jpg (256x256) from Unsplash's
// CDN using the recorded face-area crop. Run `npm run portraits:assign` afterwards.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const manifests = path.join(root, "scripts/portraits");
const poolFile = path.join(root, "src/shared/people/portraitPool.json");
const people = path.join(root, "assets/profiles/people");
const entries = fs
  .readdirSync(manifests)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(manifests, file), "utf8")));
const order = { "sa-w": 0, "sa-m": 1, "in-w": 2, "in-m": 3 };
entries.sort((a, b) => order[a.id.slice(0, 4)] - order[b.id.slice(0, 4)] || a.id.localeCompare(b.id));
const seen = new Set();
for (const entry of entries) {
  if (!/^(sa|in)-[wm]-\d\d$/.test(entry.id)) throw new Error("Bad portrait id " + entry.id);
  if (seen.has(entry.id) || seen.has(entry.unsplashId))
    throw new Error("Duplicate portrait " + entry.id + " / " + entry.unsplashId);
  seen.add(entry.id).add(entry.unsplashId);
}
const pool = entries.map(({ id, gender, look, unsplashId, photographer, photographerUrl, page }) => ({
  id,
  gender,
  look,
  unsplashId,
  photographer,
  photographerUrl,
  page,
}));
fs.writeFileSync(poolFile, JSON.stringify(pool, null, 1) + "\n");
console.log(`Wrote ${pool.length} portraits to ${path.relative(root, poolFile)}`);

/** The recorded crop at an exact square size (size, format and quality are always overridden). */
function cdnUrl(entry, size, quality) {
  const params = new URLSearchParams(entry.params);
  params.set("w", String(size));
  params.set("h", String(size));
  params.set("fm", "jpg");
  params.set("q", String(quality));
  return entry.raw.split("?")[0] + "?" + params.toString();
}
async function download() {
  fs.mkdirSync(path.join(people, "thumbs"), { recursive: true });
  for (const entry of entries)
    for (const [file, size, quality] of [
      [path.join(people, entry.id + ".jpg"), 1080, 85],
      [path.join(people, "thumbs", entry.id + ".jpg"), 256, 82],
    ]) {
      const response = await fetch(cdnUrl(entry, size, quality));
      if (!response.ok) throw new Error(`${entry.id}: HTTP ${response.status}`);
      fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }
  console.log(`Downloaded ${entries.length} portraits and thumbnails`);
}
if (process.argv.includes("--download")) download();
