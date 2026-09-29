// React Native Web also reports hover and keyboard focus to Pressable's style
// and children callbacks; native platforms leave them undefined.
import "react-native/Libraries/Components/Pressable/Pressable";

declare module "react-native/Libraries/Components/Pressable/Pressable" {
  interface PressableStateCallbackType {
    readonly hovered?: boolean;
    readonly focused?: boolean;
  }
}

export {};
