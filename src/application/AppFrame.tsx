import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { useApp } from "./AppProvider";
import { useTheme } from "../shared/theme/Theme";
import { LaunchScreen } from "../shared/ui/LaunchScreen";
import { WebRefresh } from "./WebRefresh";

export function AppFrame({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useApp();
  const theme = useTheme();
  const [launch, setLaunch] = useState(true);
  const content = useRef<View>(null);
  useLayoutEffect(() => {
    if (Platform.OS === "web" && content.current) {
      (content.current as unknown as HTMLElement).inert = launch;
    }
  }, [launch]);
  const finish = useCallback(() => setLaunch(false), []);
  // The same Stack element on every render, so an app change that re-renders
  // this frame does not re-render the navigator and all of its screens. Native
  // freezes blurred screens (web: app/index.tsx).
  const stack = useMemo(
    () => (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: theme.background },
          freezeOnBlur: true,
        }}
      />
    ),
    [theme.background],
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        ref={content}
        style={{ flex: 1 }}
        pointerEvents={launch ? "none" : "auto"}
        accessibilityElementsHidden={launch}
        importantForAccessibility={launch ? "no-hide-descendants" : "auto"}
      >
        {/* Android measures text once. Screens laid out before Inter loads keep
            fallback-font widths, then clip their last word when Inter draws. */}
        {fontsReady && stack}
      </View>
      {launch && <LaunchScreen ready={fontsReady && ready} onDone={finish} />}
      {!launch && <WebRefresh />}
    </View>
  );
}
