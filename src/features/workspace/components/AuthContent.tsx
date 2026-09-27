import React from "react";
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";

/** Login is a fixed pane. Longer registration/recovery flows retain their own scroll. */
export function AuthContent({
  fixed,
  spacing,
  onLayout,
  children,
  weight = 1,
}: {
  fixed: boolean;
  spacing: ViewStyle;
  onLayout: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
  weight?: number;
}) {
  if (fixed)
    return (
      <View
        onLayout={onLayout}
        style={[
          { flex: weight, minWidth: 0, justifyContent: "center" },
          spacing,
        ]}
      >
        {children}
      </View>
    );
  return (
    <ScrollView
      style={{ flex: weight }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        ...spacing,
      }}
    >
      {children}
    </ScrollView>
  );
}
