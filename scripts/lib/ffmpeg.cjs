// Runs ffmpeg for the demo media scripts (scripts/prepare-demo-*.cjs and
// prepare-media-frames.cjs).
const { spawnSync } = require("node:child_process");

/** Header of the ASS subtitle files that draw the demo banner and boxes on 1920x1080 frames. */
const ASS_HEADER = `[Script Info]\nPlayResX: 1920\nPlayResY: 1080\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,30,&H00FFFFFF,&H00FFFFFF,&H00102030,&H00102030,-1,0,0,0,100,100,0,0,1,2,0,7,0,0,0,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

/** run(args) calls the `exe` ffmpeg (errors only, overwriting outputs) in `cwd`; a failure throws. */
const runner =
  (exe, { cwd } = {}) =>
  (args) => {
    const result = spawnSync(
      exe,
      ["-hide_banner", "-loglevel", "error", "-y", ...args],
      { cwd, stdio: "inherit" },
    );
    if (result.status !== 0)
      throw new Error("ffmpeg failed: " + args.join(" "));
  };

module.exports = { ASS_HEADER, runner };
