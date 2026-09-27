// Platform-independent app lock rules, kept free of React Native imports so
// they can be unit tested in Node.
export const PIN_LENGTH = 4;
export const ATTEMPTS_BEFORE_COOLDOWN = 5;
export type BiometricKind = "face" | "fingerprint" | "iris";
export const lockTimeouts = [
  { value: 0, label: "Immediately" },
  { value: 30, label: "After 30 seconds" },
  { value: 60, label: "After 1 minute" },
  { value: 300, label: "After 5 minutes" },
];

/** 30 s after five failures, doubling for each further five, capped at 15 min. */
export function cooldownFor(failures: number) {
  if (failures <= 0 || failures % ATTEMPTS_BEFORE_COOLDOWN) return 0;
  const rounds = failures / ATTEMPTS_BEFORE_COOLDOWN;
  return Math.min(30_000 * 2 ** (rounds - 1), 15 * 60_000);
}
export function attemptsRemaining(failures: number) {
  return ATTEMPTS_BEFORE_COOLDOWN - (failures % ATTEMPTS_BEFORE_COOLDOWN);
}
export function shouldLock(
  backgroundAt: number | null,
  now: number,
  timeoutSeconds: number,
) {
  return backgroundAt !== null && now - backgroundAt >= timeoutSeconds * 1000;
}
export function isValidPin(pin: string) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}
export function biometricLabel(kinds: BiometricKind[], ios: boolean) {
  const face = kinds.includes("face");
  const finger = kinds.includes("fingerprint");
  if (face && finger) return "Face or fingerprint";
  if (face) return ios ? "Face ID" : "Face unlock";
  if (finger) return ios ? "Touch ID" : "Fingerprint";
  if (kinds.includes("iris")) return "Iris";
  return "Biometrics";
}
export function biometricIcon(kinds: BiometricKind[]) {
  return kinds.includes("face") && !kinds.includes("fingerprint")
    ? "face"
    : "fingerprint";
}
