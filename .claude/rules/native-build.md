---
paths:
  - "android/**"
  - "ios/**"
  - "plugins/**"
  - "app.json"
  - "app.config.js"
---

# Native builds (Android APK on Windows)

Start a native build only when the person asks for one. A JS-only rebuild takes about 2 to 8 minutes, and a first build about 17. The README's "Android APK for sideloading" section is the short version; this file adds the pitfalls.

## Toolchain

- JDK 17 (Temurin) and the Android SDK, both installable per user without admin. The README assumes `%LOCALAPPDATA%\Android\jdk17` and `%LOCALAPPDATA%\Android\Sdk`. Gradle fetches NDK 27.1 and CMake 3.22.1 itself.
- Set `JAVA_HOME` and `ANDROID_HOME` to those folders in the shell that runs Gradle.

## Build steps

1. `npx expo prebuild --platform android` generates `android/` (gitignored) from `app.json`, with the launcher icon, adaptive icon and splash from `assets/app/`. Prebuild is only needed when native config or dependencies change. JS and asset changes can go straight to step 3.
2. After a prebuild, fix three things it resets or rewrites:
   - `android/gradle.properties`: `reactNativeArchitectures=armeabi-v7a,arm64-v8a` (phones only, and a shorter build).
   - `android/local.properties`: `sdk.dir=` pointing at the SDK, with forward slashes.
   - `package.json`: prebuild changes the `android` and `ios` scripts to `expo run:*`. Set them back to `expo start --android` / `expo start --ios`. Don't `git checkout package.json` for this, because that also drops newly added dependencies.
3. Build from a short path. Gesture-handler codegen object paths exceed Windows' 260-character limit (and `LongPathsEnabled` needs admin to change). `plugins/withWindowsCmakePaths.js` adds `-DCMAKE_OBJECT_PATH_MAX=250`, which only fits from a short root:
   ```powershell
   subst V: <parent folder of vizenta-ai>
   V:\vizenta-ai\android\gradlew.bat assembleRelease
   subst V: /D
   ```
   Map the parent folder, never the project itself. Expo autolinking can't find `package.json` at a drive root. Run `subst V: /D` from PowerShell, because Git Bash rewrites `/D` into a path.
4. The APK is at `android/app/build/outputs/apk/release/app-release.apk`. It is about 113 MB, most of it the portraits and demo media.

## Signing

The release build is signed with the generated debug keystore. It installs on any device that allows unknown apps, but it can't go to the Play Store, and a build signed with a different key can't update it in place. Publishing needs a real release keystore.

## Checking what went into the APK

- Expo SDK 57 links modules as precompiled libraries, so no `:expo-*:` Gradle tasks appear in the log. To confirm a module is included, search the `classes*.dex` files for `Lexpo/modules/<name>/`.
- Metro shortens asset names on Android (e.g. `res/4N.mp4`). Count media with `unzip -l` on the APK, filtering for jpg and mp4 entries.
- Hermes stores strings that contain non-ASCII characters (such as "·") as UTF-16. When you search the bundle for a string, use an ASCII-only fragment.

## Emulator

An x86_64 Google APIs image (Android 35) with WHPX acceleration runs the arm64 APK through translation. Boot it headless with `emulator -avd <name> -no-window -no-audio -gpu swiftshader_indirect -memory 4096` (about 2 minutes) and stop it with `adb emu kill`. Use it only when asked; people usually test on their own phones.

## JS bundles only

`npm run build:native` exports the iOS and Android JS/Hermes bundles to `dist-native/`. That proves the code compiles for native, not that it runs on a device. iOS builds need a Mac with Xcode (`npm run ios`).
