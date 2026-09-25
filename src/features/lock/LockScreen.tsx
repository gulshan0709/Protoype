import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, StatusBar, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../application/AppProvider";
import { useAppLock } from "../../application/AppLockProvider";
import { biometricIcon, biometricLabel } from "../../application/appLock";
import { light } from "../../shared/theme/Theme";
import { Txt } from "../../shared/ui/Primitives";
import { BrandWordmark } from "../../shared/ui/Icon";
import { PinPad } from "./PinPad";

export function LockScreen() {
  const lock = useAppLock();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(Date.now());
  const prompted = useRef(false);
  const waitMs = lock.config.lockedUntil - now;
  const cooling = waitMs > 0;
  const canUseBiometrics =
    lock.config.biometrics && lock.biometricKinds.length > 0;

  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooling]);

  const tryBiometrics = useCallback(async () => {
    setError(undefined);
    await lock.unlockWithBiometrics();
  }, [lock.unlockWithBiometrics]);

  // Offer biometrics once each time the lock appears.
  useEffect(() => {
    if (!lock.locked) {
      prompted.current = false;
      setError(undefined);
      return;
    }
    setNow(Date.now());
    if (!canUseBiometrics || prompted.current) return;
    prompted.current = true;
    const timer = setTimeout(tryBiometrics, 300);
    return () => clearTimeout(timer);
  }, [lock.locked, canUseBiometrics, tryBiometrics]);

  const submit = async (pin: string) => {
    const result = await lock.checkPin(pin);
    setNow(Date.now());
    if (result.ok) return setError(undefined);
    setError(
      result.lockedUntil
        ? undefined
        : `Incorrect PIN. ${result.remaining} ${
            result.remaining === 1 ? "attempt" : "attempts"
          } left before a short wait.`,
    );
  };

  const forgot = () =>
    Alert.alert(
      "Reset app lock?",
      "You will be signed out and the PIN is removed from this device. Sign in again to set a new one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => lock.resetAndSignOut(),
        },
      ],
    );

  return (
    <Modal
      visible={lock.locked}
      animationType="fade"
      statusBarTranslucent
      // Android Back must not dismiss the lock.
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" />
      <View
        testID="app-lock-screen"
        accessibilityViewIsModal
        style={{
          flex: 1,
          backgroundColor: light.sidebar,
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + 36,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <BrandWordmark width={150} />
        <PinPad
          brand
          title="Enter your PIN"
          subtitle={
            cooling
              ? `Too many attempts. Try again in ${Math.ceil(waitMs / 1000)}s.`
              : `Signed in as ${app.name}`
          }
          error={error}
          disabled={cooling}
          resetKey={lock.locked}
          onComplete={submit}
          biometric={
            canUseBiometrics
              ? {
                  label: biometricLabel(lock.biometricKinds),
                  icon: biometricIcon(lock.biometricKinds),
                  onPress: tryBiometrics,
                }
              : undefined
          }
        />
        <Pressable
          accessibilityRole="button"
          onPress={forgot}
          hitSlop={10}
          style={{ paddingVertical: 8 }}
        >
          <Txt size={13} bold color={light.sidebarAccent}>
            Forgot PIN? Sign out
          </Txt>
        </Pressable>
      </View>
    </Modal>
  );
}
