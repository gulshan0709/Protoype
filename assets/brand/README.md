# Vizenta brand asset

`vizenta-logo-full.png` is copied unchanged from
`Vizenta_Four_Industry_Interactive_UI_Dev_Package_2026-09-21/dist/assets/vizenta-logo.png`
(3644 × 840). It is the supplied reference wordmark. The app draws
`vizenta-logo.png`, the same image scaled to 1040 × 240: the wordmark is at most
208 dp wide, so this stays sharp on 3× screens while decoding about 1 MB instead
of 12 MB (`ffmpeg -i vizenta-logo-full.png -vf scale=1040:-1:flags=lanczos vizenta-logo.png`).

The standalone `BrandMark` in `src/shared/ui/Icon.tsx` uses the vector paths from
`vizenta-ai-ui-main/src/assests/images/Favicon.svg`, with a white V for the navy
background. It preserves the supplied cyan gradients without cropping the wordmark.

`public/favicon.svg` uses the same reference paths on a navy square for the
browser tab icon. `public/index.html` links it in the document head.
