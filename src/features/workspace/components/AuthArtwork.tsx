import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { authUseCases } from "../model/authUseCases";
import type { AuthShowcaseState } from "../hooks/useAuthShowcase";
import { motion } from "../../../shared/motion/tokens";

function Slide({
  slide,
  showcase,
}: {
  slide: (typeof authUseCases)[number];
  showcase: AuthShowcaseState;
}) {
  const selected = showcase.selected === slide.id;
  const opacity = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    opacity.stopAnimation();
    if (showcase.reduced) {
      opacity.setValue(selected ? 1 : 0);
      return;
    }
    const animation = Animated.timing(opacity, {
      toValue: selected ? 1 : 0,
      duration: motion.enter,
      easing: motion.easing,
      useNativeDriver: motion.nativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, showcase.reduced, opacity]);
  return (
    <Animated.Image
      testID={`auth-slide-${slide.id}`}
      source={slide.source}
      accessibilityLabel={slide.imageLabel}
      accessible={selected}
      accessibilityElementsHidden={!selected}
      importantForAccessibility={selected ? "yes" : "no-hide-descendants"}
      aria-hidden={!selected}
      onLoad={() => showcase.markLoaded(slide.id)}
      resizeMode="cover"
      style={[
        StyleSheet.absoluteFill,
        { width: "100%", height: "100%", opacity },
      ]}
    />
  );
}
export function AuthArtwork({ showcase }: { showcase: AuthShowcaseState }) {
  return (
    <View
      pointerEvents="none"
      testID="auth-connected-spaces"
      style={StyleSheet.absoluteFill}
    >
      {authUseCases.map((slide) => (
        <Slide key={slide.id} slide={slide} showcase={showcase} />
      ))}
    </View>
  );
}
