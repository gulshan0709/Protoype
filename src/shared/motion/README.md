# Shared motion

Reference: `testing/expo-app/src/shared/hooks/useLaunchSplash.ts`, `useReducedMotion.ts`, and `src/shared/theme/motion.ts`. This implementation uses Vizenta branding and the same short, eased, native-driver approach.

- Startup shows the logo and a moving light until bundled fonts and saved preferences are ready. The intro lasts 360 ms; a 280 ms fade removes the overlay once ready. It runs once per app mount, never on each navigation.
- Page content and auth steps fade and rise 12 px over 260 ms. Headers/sidebar stay stable. Motion restarts on actual destinations, workspace scope, record, metric, or auth step changes; typing and filtering do not restart it.
- Dialog panels rise 12 px on desktop and 28 px on phones. Closing remains immediate and retains existing Escape, focus return, and native Back handling.
- Animations use opacity/transforms, with the native driver on iOS/Android and React Native's web driver on web. All running animations/timers clean up on interruption or unmount.
- Reduced-motion preferences are observed once and shared. Motion becomes static immediately when enabled, including the loading indicator. No routes, providers, forms, or scroll containers are re-keyed to animate.

Run `npm run test:motion` against the built preview. Native bundle exports verify compilation, not native device runtime behavior.
