import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "./tokens";
import { useReducedMotion } from "./MotionProvider";

export function useLaunchMotion(ready: boolean, onDone?: () => void) {
  const reduced = useReducedMotion();
  const started = useRef(Date.now()).current;
  const logo = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    logo.setValue(reduced ? 1 : 0);
    shine.setValue(0);
    if (reduced) return;
    const intro = Animated.timing(logo, {
      toValue: 1,
      duration: motion.launchIntro,
      easing: motion.easing,
      useNativeDriver: motion.nativeDriver,
      isInteraction: false,
    });
    const loop = Animated.loop(
      Animated.timing(shine, {
        toValue: 1,
        duration: motion.loadingCycle,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: motion.nativeDriver,
        isInteraction: false,
      }),
    );
    intro.start();
    loop.start();
    return () => {
      intro.stop();
      loop.stop();
    };
  }, [reduced, logo, shine]);
  useEffect(() => {
    if (!ready || !onDone) return;
    const exit = Animated.timing(opacity, {
      toValue: 0,
      duration: reduced ? 0 : motion.launchExit,
      easing: motion.easing,
      useNativeDriver: motion.nativeDriver,
      isInteraction: false,
    });
    const timer = setTimeout(
      () =>
        exit.start(({ finished }) => {
          if (finished) onDone();
        }),
      reduced ? 0 : Math.max(0, motion.launchIntro - (Date.now() - started)),
    );
    return () => {
      clearTimeout(timer);
      exit.stop();
    };
  }, [ready, reduced, opacity, started, onDone]);
  return { reduced, logo, shine, opacity };
}
