# Vizenta brand asset

`vizenta-logo.png` is copied unchanged from
`Vizenta_Four_Industry_Interactive_UI_Dev_Package_2026-09-21/dist/assets/vizenta-logo.png`.
It is the supplied reference wordmark, shared across the native and web UI.

The standalone `BrandMark` in `src/shared/ui/Icon.tsx` uses the vector paths from
`vizenta-ai-ui-main/src/assests/images/Favicon.svg`, with a white V for the navy
background. It preserves the supplied cyan gradients without cropping the wordmark.

`public/favicon.svg` uses the same reference paths on a navy square for the
browser tab icon. `public/index.html` links it in the document head.
