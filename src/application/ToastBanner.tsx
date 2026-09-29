import { View, useWindowDimensions } from "react-native";
import { useToast } from "./AppProvider";
import { useTheme } from "../shared/theme/Theme";
import { Txt } from "../shared/ui/Primitives";

/**
 * The workspace's toast: bottom right on desktop, above the bottom navigation
 * on phones. The only reader of the toast, so a message re-renders just this.
 */
export function ToastBanner() {
  const toast = useToast();
  const c = useTheme();
  const phone = useWindowDimensions().width < 768;
  if (!toast) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        position: "absolute",
        bottom: phone ? 80 : 24,
        left: phone ? 18 : undefined,
        right: phone ? 18 : 30,
        backgroundColor: c.ink,
        borderRadius: 12,
        padding: 17,
        maxWidth: 460,
      }}
    >
      {/* ink is dark in the light theme and near-white in the dark one;
          surface is its readable opposite in both. */}
      <Txt size={12} color={c.surface}>
        {toast}
      </Txt>
    </View>
  );
}
