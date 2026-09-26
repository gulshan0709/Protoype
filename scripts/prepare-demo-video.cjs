// Regenerate local 1080p demo clips from the source documented in assets/media/README.md.
// Usage: node scripts/prepare-demo-video.cjs <ffmpeg executable> <source.mp4>
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { detectionStyles } = require("../src/domain/contracts/detectionDemo.ts");
const [ffmpeg, source] = process.argv.slice(2);
if (!ffmpeg || !source)
  throw new Error("Provide ffmpeg and the downloaded source video");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vizenta-media-"));
const root = path.resolve(__dirname, "..");
const first = [
  [0, 55, 55, 5, 28],
  [2, 51, 55, 5, 30],
  [4, 49, 54, 6, 33],
  [6, 49, 51, 8, 43],
  [6.6, 49, 51, 8, 43],
];
const second = [
  [4.5, 0, 32, 22, 68],
  [5, 7, 35, 27, 65],
  [6, 25, 39, 33, 61],
  [7, 37, 42, 23, 58],
  [8, 43, 42, 19, 58],
];
function at(frames, t) {
  if (t < frames[0][0] || t > frames.at(-1)[0]) return;
  const b = frames.findIndex((f) => f[0] >= t);
  if (b === 0) return frames[0].slice(1);
  const a = frames[b - 1],
    z = frames[b],
    p = (t - a[0]) / (z[0] - a[0]);
  return a.slice(1).map((v, i) => v + (z[i + 1] - v) * p);
}
const time = (t) => `0:00:${t.toFixed(2).padStart(5, "0")}`;
const color = (hex) =>
  "&H" + hex.slice(5, 7) + hex.slice(3, 5) + hex.slice(1, 3) + "&";
const header = `[Script Info]\nPlayResX: 1920\nPlayResY: 1080\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,30,&H00FFFFFF,&H00FFFFFF,&H00102030,&H00102030,-1,0,0,0,100,100,0,0,1,2,0,7,0,0,0,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
function run(args) {
  const result = spawnSync(
    ffmpeg,
    ["-hide_banner", "-loglevel", "error", "-y", ...args],
    { cwd: temp, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("Video conversion failed");
}
[
  ["identified", "visitor"],
  ["threat", "identified"],
  ["unidentified", "visitor"],
  ["visitor", "unidentified"],
].forEach((kinds, index) => {
  let ass = header;
  const event = (start, end, text) => {
    ass += `Dialogue: 0,${time(start)},${time(end)},Default,,0,0,0,,${text}\n`;
  };
  event(
    0,
    8,
    "{\\pos(36,28)\\fs28}DEMO CAMERA 0" +
      (index + 1) +
      "  |  SIMULATED DETECTIONS",
  );
  event(
    0,
    8,
    "{\\pos(36,70)\\fs23}Sample footage - classifications are fictional",
  );
  for (let n = 0; n < 200; n++) {
    const t = n / 25;
    [first, second].forEach((frames, j) => {
      const box = at(frames, t);
      if (!box) return;
      const [x, y, w, h] = box.map((v, i) =>
        Math.round(v * (i % 2 === 0 ? 19.2 : 10.8)),
      );
      const style = detectionStyles[kinds[j]],
        c = color(style.color);
      const outer = `m 0 0 l ${w} 0 ${w} ${h} 0 ${h} 0 0 m 4 4 l 4 ${h - 4} ${w - 4} ${h - 4} ${w - 4} 4 4 4`;
      event(
        t,
        t + 0.04,
        `{\\pos(${x},${y})\\bord0\\shad0\\1c${c}\\p1}${outer}`,
      );
      event(
        t,
        t + 0.04,
        `{\\pos(${x},${Math.max(112, y - 38)})\\1c${c}\\fs28}${style.label.toUpperCase()} (DEMO)`,
      );
    });
  }
  const filename = `tracking-${index}.ass`;
  fs.writeFileSync(path.join(temp, filename), ass);
  const dest =
    index === 3
      ? path.join(temp, "visitor.mp4")
      : path.join(root, `assets/media/gate-${index + 1}.mp4`);
  run([
    "-i",
    source,
    "-t",
    "8",
    "-vf",
    `ass=${filename}`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    dest,
  ]);
  run([
    "-i",
    dest,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    path.join(root, `assets/media/capture-${index + 1}.jpg`),
  ]);
});
console.log(
  "Prepared three 1920x1080 demo clips with synchronized tracking and matching captures.",
);
