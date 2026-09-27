# HD demonstration footage

Source: [Women walking and greeting each other inside an office](https://www.pexels.com/video/women-walking-and-greeting-each-other-inside-an-office-3201794/) by cottonbro studio, under the [Pexels license](https://www.pexels.com/license/).

The bundled clips are eight-second, silent 1920 x 1080 H.264 excerpts. Three scenarios reuse the same office footage with different fictional classifications: identified / visitor, threat / identified, and unidentified / visitor. Labels describe simulated demo events and make no claims about the people in the footage. These are recordings, not live feeds or real recognition results.

Tracking boxes and labels are encoded into each clip so pause, seek, mobile playback and fullscreen keep them synchronized. Yellow = threat, green = identified, violet = visitor, red = unidentified. Four matching HD captures cover the four classifications. Profile images use separate fictional generated portraits.

To regenerate, download the source to a local temporary file and run `node scripts/prepare-demo-video.cjs <ffmpeg-executable> <source.mp4>`. The clips use `capture-1.jpg` to `capture-3.jpg` as posters.

## Per-person stills

`still-*.jpg` are 1280 x 720 JPEGs (45–245 KB, about 1.9 MB in total) with the same burned-in "DEMO CAMERA NN | SIMULATED DETECTIONS" banner. The app draws the detection box and label from `src/features/workspace/components/demoCaptures.ts`, so one file serves every classification.

- `still-w1` to `still-w7`: frames at 4.2, 5.3, 10.6, 11.5, 14.3, 16.2 and 19.0 s of the footage above. The footage shows only women.
- `still-w8`, `still-m1`, `still-m2`: `assets/auth/surveillance-lobby-front.png`. `still-m3`: `assets/auth/education-surveillance.png`. `still-m4` to `still-m6`: `assets/auth/education-classroom.png`. `still-m7`: `assets/auth/options/camera-view.png`. These are the bundled, generated login artwork with fictional people (see `assets/auth/use-case-artwork.md`), cropped to 16:9.

To regenerate, run `node scripts/prepare-demo-captures.cjs <ffmpeg-executable> <source.mp4>`. It rewrites the stills and `demoCaptures.ts` and leaves the clips untouched. The shared detection colors are defined in `src/domain/contracts/detectionDemo.ts`. No external media requests occur at runtime.
