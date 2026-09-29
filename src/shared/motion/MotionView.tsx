import type { ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { useEntrance } from "./useEntrance";

// Not memoised: it always receives new children, so a memo never skips.
export function MotionView({
  sceneKey,
  children,
  style,
  testID,
}: {
  sceneKey: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const entrance = useEntrance(sceneKey);
  return (
    <Animated.View testID={testID} style={[style, entrance]}>
      {children}
    </Animated.View>
  );
}
