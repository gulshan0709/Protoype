import { useLayoutEffect, useMemo, useRef } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "./MotionProvider";
import { motion } from "./tokens";

/** Animate an existing tree; never re-key a form, provider, or scroll container. */
export function useEntrance(
  sceneKey: string,
  distance: number = motion.distance,
) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useLayoutEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.enter,
      easing: motion.easing,
      useNativeDriver: motion.nativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [sceneKey, reduced, progress]);
  return useMemo(
    () => ({
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.72, 1],
      }),
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    }),
    [progress, distance],
  );
}
