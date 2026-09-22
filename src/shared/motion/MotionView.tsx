import React from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { useEntrance } from "./useEntrance";

export const MotionView = React.memo(function MotionView({
  sceneKey,
  children,
  style,
  testID,
}: {
  sceneKey: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const entrance = useEntrance(sceneKey);
  return (
    <Animated.View testID={testID} style={[style, entrance]}>
      {children}
    </Animated.View>
  );
});
