import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { light } from "../theme/Theme";
import { BrandWordmark } from "./Icon";
import { useLaunchMotion } from "../motion/useLaunchMotion";

export function LaunchScreen({
  ready = false,
  onDone,
  overlay = false,
}: {
  ready?: boolean;
  onDone?: () => void;
  overlay?: boolean;
}) {
  const { reduced, logo, shine, opacity } = useLaunchMotion(ready, onDone);
  return (
    <Animated.View
      testID={overlay ? "launch-screen" : "workspace-loading"}
      accessibilityLabel="Loading Vizenta AI"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: !ready }}
      style={[styles.screen, overlay && styles.overlay, { opacity }]}
    >
      <Animated.View
        style={{
          alignItems: "center",
          gap: 22,
          opacity: logo.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          }),
          transform: [
            {
              translateY: logo.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        }}
      >
        <BrandWordmark width={208} />
        <View style={styles.track}>
          <Animated.View
            testID="launch-loading-light"
            style={[
              styles.light,
              {
                transform: [
                  {
                    translateX: reduced
                      ? 51
                      : shine.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-42, 144],
                        }),
                  },
                ],
              },
            ]}
          />
        </View>
        <Text style={styles.caption}>
          {ready ? "Your workspace is ready" : "Preparing your workspace"}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: light.sidebar,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  track: {
    width: 144,
    height: 3,
    backgroundColor: light.sidebarActive,
    borderRadius: 2,
    overflow: "hidden",
  },
  light: {
    width: 42,
    height: 3,
    backgroundColor: light.primary,
    borderRadius: 2,
  },
  caption: { color: light.sidebarMuted, fontSize: 12 },
});
