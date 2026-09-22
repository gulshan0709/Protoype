import { Easing, Platform } from "react-native";

// Adapted from testing/expo-app's short, eased, native-driver motion pattern.
export const motion = {
  enter: 260,
  launchIntro: 360,
  launchExit: 280,
  loadingCycle: 1000,
  distance: 12,
  easing: Easing.out(Easing.cubic),
  nativeDriver: Platform.OS !== "web",
} as const;
