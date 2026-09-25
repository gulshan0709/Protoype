import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../src/application/AppProvider";
import { useFonts } from "expo-font";
import { MotionProvider } from "../src/shared/motion/MotionProvider";
import { AppFrame } from "../src/application/AppFrame";
import { AppLockProvider } from "../src/application/AppLockProvider";
import { LockScreen } from "../src/features/lock/LockScreen";
export default function Layout() {
  const [loaded, error] = useFonts({
    Inter: require("../assets/fonts/Inter-Regular.otf"),
    InterMedium: require("../assets/fonts/Inter-Medium.otf"),
    InterBold: require("../assets/fonts/Inter-Bold.otf"),
  });
  return (
    <SafeAreaProvider>
      <MotionProvider>
        <AppProvider>
          <AppLockProvider>
            <AppFrame fontsReady={loaded || Boolean(error)} />
            <LockScreen />
          </AppLockProvider>
        </AppProvider>
      </MotionProvider>
    </SafeAreaProvider>
  );
}
