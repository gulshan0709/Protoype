import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/Theme";
import { IconButton, Row, Txt } from "./Primitives";
import { useEntrance } from "../motion/useEntrance";
import { useReducedMotion } from "../motion/MotionProvider";
const dialogStack: symbol[] = [];
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const c = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const entrance = useEntrance(title, width < 768 ? 28 : 12);
  const reduced = useReducedMotion();
  const root = useRef<View>(null);
  const token = useRef(Symbol("dialog"));
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const previous = document.activeElement as HTMLElement | null;
    dialogStack.push(token.current);
    const listener = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== token.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const element = root.current as unknown as HTMLElement;
        const focusables = Array.from(
          element?.querySelectorAll<HTMLElement>(
            'button,input,textarea,[tabindex="0"]',
          ) ?? [],
        );
        const first = focusables[0],
          last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    const timer = setTimeout(
      () =>
        (root.current as unknown as HTMLElement)
          ?.querySelector<HTMLElement>('button,input,[tabindex="0"]')
          ?.focus(),
      80,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", listener);
      const index = dialogStack.indexOf(token.current);
      if (index >= 0) dialogStack.splice(index, 1);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <Modal
      visible
      transparent
      animationType={reduced ? "none" : "fade"}
      // Web Escape is handled once on keydown above. RN Web also emits
      // onRequestClose on keyup, which can otherwise close the parent dialog.
      onRequestClose={Platform.OS === "web" ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : Platform.OS === "android"
              ? "height"
              : undefined
        }
        style={{
          flex: 1,
          justifyContent: width < 768 ? "flex-end" : "center",
          alignItems: "center",
          padding: width < 768 ? 0 : 30,
        }}
      >
        <Pressable
          accessibilityLabel="Dismiss dialog"
          onPress={onClose}
          style={{ position: "absolute", inset: 0, backgroundColor: c.overlay }}
        />
        <Animated.View
          ref={root}
          testID="dialog-transition"
          accessibilityViewIsModal
          style={[
            {
              width: "100%",
              maxWidth: wide ? 780 : 560,
              flexShrink: 1,
              maxHeight: height - insets.top - 36,
              backgroundColor: c.surface,
              borderRadius: 15,
              borderWidth: 1,
              borderColor: c.border,
              paddingBottom: insets.bottom,
            },
            entrance,
          ]}
        >
          <Row
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Txt size={16} bold style={{ flex: 1 }}>
              {title}
            </Txt>
            <IconButton name="close" label="Close dialog" onPress={onClose} />
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingVertical: 15,
              paddingHorizontal: 16,
              gap: 14,
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
