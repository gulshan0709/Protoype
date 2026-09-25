// Device-level app lock. The PIN is stored only as a salted SHA-256 digest in
// the platform keystore (Android Keystore / iOS Keychain), never in AsyncStorage.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";

import {
  biometricLabel as labelFor,
  type BiometricKind,
} from "../domain/lock/policy";
export {
  biometricIcon,
  lockTimeouts,
  PIN_LENGTH,
  type BiometricKind,
} from "../domain/lock/policy";

export const lockSupported = Platform.OS !== "web";
export interface LockConfig {
  enabled: boolean;
  biometrics: boolean;
  /** Seconds the app may stay in the background before it locks. */
  timeout: number;
  salt: string;
  pinHash: string;
  failures: number;
  lockedUntil: number;
}
export const disabledLock: LockConfig = {
  enabled: false,
  biometrics: false,
  timeout: 60,
  salt: "",
  pinHash: "",
  failures: 0,
  lockedUntil: 0,
};
const key = "vizenta-app-lock-v1";

export async function loadLock(): Promise<LockConfig> {
  if (!lockSupported) return disabledLock;
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return disabledLock;
  const parsed = { ...disabledLock, ...JSON.parse(raw) } as LockConfig;
  // A config without a PIN cannot be unlocked, so treat it as off.
  return parsed.enabled && parsed.pinHash ? parsed : disabledLock;
}
export async function saveLock(config: LockConfig) {
  if (!lockSupported) return;
  if (!config.enabled) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, JSON.stringify(config));
}
export async function pinRecord(pin: string) {
  const salt = Crypto.randomUUID();
  return { salt, pinHash: await hashPin(pin, salt) };
}
export function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}
export async function biometricKinds(): Promise<BiometricKind[]> {
  if (!lockSupported) return [];
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) return [];
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const { AuthenticationType: T } = LocalAuthentication;
    return types.flatMap((type): BiometricKind[] =>
      type === T.FACIAL_RECOGNITION
        ? ["face"]
        : type === T.FINGERPRINT
          ? ["fingerprint"]
          : type === T.IRIS
            ? ["iris"]
            : [],
    );
  } catch {
    return [];
  }
}
export function biometricLabel(kinds: BiometricKind[]) {
  return labelFor(kinds, Platform.OS === "ios");
}
export async function promptBiometrics(message: string) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      cancelLabel: "Use PIN",
      // The app PIN is the fallback, not the device passcode.
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
