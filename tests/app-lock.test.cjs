const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PIN_LENGTH,
  ATTEMPTS_BEFORE_COOLDOWN,
  cooldownFor,
  attemptsRemaining,
  shouldLock,
  isValidPin,
  biometricLabel,
  biometricIcon,
  lockTimeouts,
} = require("../src/domain/lock/policy.ts");

test("wrong PINs wait only after every fifth failure, doubling to a cap", () => {
  assert.equal(ATTEMPTS_BEFORE_COOLDOWN, 5);
  for (const failures of [0, 1, 4, 6, 9])
    assert.equal(cooldownFor(failures), 0);
  assert.equal(cooldownFor(5), 30_000);
  assert.equal(cooldownFor(10), 60_000);
  assert.equal(cooldownFor(15), 120_000);
  assert.equal(cooldownFor(100), 15 * 60_000);
});

test("remaining attempts count down and reset after each wait", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(attemptsRemaining),
    [4, 3, 2, 1, 5, 4],
  );
});

test("the app locks only after the chosen time in the background", () => {
  const away = 1_000_000;
  assert.equal(shouldLock(null, away + 999_999, 0), false);
  assert.equal(shouldLock(away, away, 0), true);
  assert.equal(shouldLock(away, away + 29_999, 30), false);
  assert.equal(shouldLock(away, away + 30_000, 30), true);
  assert.deepEqual(
    lockTimeouts.map((t) => t.value),
    [0, 30, 60, 300],
  );
});

test("PINs are exactly four digits", () => {
  assert.equal(PIN_LENGTH, 4);
  assert.equal(isValidPin("0429"), true);
  for (const pin of ["123", "12345", "12a4", " 1234", ""])
    assert.equal(isValidPin(pin), false);
});

test("biometric labels follow the enrolled sensors and platform", () => {
  assert.equal(biometricLabel(["fingerprint"], false), "Fingerprint");
  assert.equal(biometricLabel(["fingerprint"], true), "Touch ID");
  assert.equal(biometricLabel(["face"], false), "Face unlock");
  assert.equal(biometricLabel(["face"], true), "Face ID");
  assert.equal(
    biometricLabel(["fingerprint", "face"], false),
    "Face or fingerprint",
  );
  assert.equal(biometricLabel(["iris"], false), "Iris");
  assert.equal(biometricIcon(["face"]), "face");
  assert.equal(biometricIcon(["face", "fingerprint"]), "fingerprint");
});
