import React, { useState } from "react";
import { View } from "react-native";
import { useApp } from "../../application/AppProvider";
import { useAppLock } from "../../application/AppLockProvider";
import {
  biometricLabel,
  lockTimeouts,
  promptBiometrics,
} from "../../application/appLock";
import { useTheme } from "../../shared/theme/Theme";
import { Button, Row, Txt } from "../../shared/ui/Primitives";
import { Select } from "../../shared/ui/Select";
import { Dialog } from "../../shared/ui/Dialog";
import { PinPad } from "./PinPad";

type Flow = "setup" | "change" | "disable";
type Step = "current" | "new" | "confirm";
const flowSteps: Record<Flow, Step[]> = {
  setup: ["new", "confirm"],
  change: ["current", "new", "confirm"],
  disable: ["current"],
};
const flowTitles: Record<Flow, string> = {
  setup: "Set up app lock",
  change: "Change PIN",
  disable: "Turn off app lock",
};

export function AppLockSettings() {
  const lock = useAppLock();
  const app = useApp();
  const c = useTheme();
  const [flow, setFlow] = useState<Flow>();
  const bioLabel = biometricLabel(lock.biometricKinds);
  const hasBiometrics = lock.biometricKinds.length > 0;

  const setBiometrics = async (on: boolean) => {
    // Confirm the sensor works before relying on it to unlock.
    if (on && !(await promptBiometrics(`Confirm ${bioLabel}`))) return;
    await lock.setPreference({ biometrics: on });
    app.notify(`${bioLabel} unlock ${on ? "on" : "off"}.`);
  };

  return (
    <>
      <View
        style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }}
      />
      <Txt size={14} bold>
        App lock
      </Txt>
      {!lock.supported ? (
        <Txt size={12} color={c.muted}>
          PIN, face and fingerprint lock are available in the Android and iOS
          apps.
        </Txt>
      ) : !lock.config.enabled ? (
        <>
          <Txt size={12} color={c.muted}>
            Require a PIN{hasBiometrics ? ` or ${bioLabel.toLowerCase()}` : ""}{" "}
            when you return to Vizenta on this device.
          </Txt>
          <Button
            label="Set up app lock"
            icon="lock"
            variant="primary"
            onPress={() => setFlow("setup")}
          />
        </>
      ) : (
        <>
          <Txt size={12} color={c.muted}>
            On. Vizenta asks for your PIN
            {lock.config.biometrics && hasBiometrics
              ? ` or ${bioLabel.toLowerCase()}`
              : ""}{" "}
            when you return to the app.
          </Txt>
          {hasBiometrics ? (
            <Select
              label={`Unlock with ${bioLabel}`}
              value={lock.config.biometrics ? "on" : "off"}
              options={[
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
              onChange={(value) => setBiometrics(value === "on")}
            />
          ) : (
            <Txt size={12} color={c.muted}>
              To unlock with face or fingerprint, add one in your device
              settings.
            </Txt>
          )}
          <Select
            label="Lock after leaving the app"
            value={String(lock.config.timeout)}
            options={lockTimeouts.map((t) => ({
              value: String(t.value),
              label: t.label,
            }))}
            onChange={(value) => lock.setPreference({ timeout: Number(value) })}
          />
          <Row style={{ gap: 10, flexWrap: "wrap" }}>
            <Button label="Change PIN" onPress={() => setFlow("change")} />
            <Button
              label="Turn off app lock"
              variant="ghost"
              onPress={() => setFlow("disable")}
            />
          </Row>
        </>
      )}
      {!!flow && (
        <PinFlow
          flow={flow}
          onClose={() => setFlow(undefined)}
          onDone={async (pin) => {
            if (flow === "disable") {
              await lock.disable();
              app.notify("App lock is off.");
            } else {
              await lock.enable(pin);
              app.notify(flow === "setup" ? "App lock is on." : "PIN changed.");
            }
            setFlow(undefined);
          }}
        />
      )}
    </>
  );
}

function PinFlow({
  flow,
  onClose,
  onDone,
}: {
  flow: Flow;
  onClose: () => void;
  onDone: (pin: string) => Promise<void>;
}) {
  const lock = useAppLock();
  const steps = flowSteps[flow];
  const [index, setIndex] = useState(0);
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const step = steps[index];
  const advance = async (pin: string) => {
    if (index === steps.length - 1) {
      setBusy(true);
      await onDone(first || pin);
      return;
    }
    setIndex(index + 1);
  };
  const complete = async (pin: string) => {
    setError(undefined);
    if (step === "current") {
      const result = await lock.checkPin(pin);
      if (!result.ok)
        return setError(
          result.lockedUntil
            ? "Too many attempts. Try again shortly."
            : "Incorrect PIN.",
        );
      return advance(pin);
    }
    if (step === "new") {
      setFirst(pin);
      return advance(pin);
    }
    if (pin !== first) {
      setFirst("");
      setIndex(steps.indexOf("new"));
      return setError("PINs didn't match. Enter a new PIN again.");
    }
    return advance(pin);
  };
  return (
    <Dialog title={flowTitles[flow]} onClose={onClose}>
      <PinPad
        title={
          step === "current"
            ? "Enter your current PIN"
            : step === "new"
              ? "Choose a 4-digit PIN"
              : "Confirm your PIN"
        }
        subtitle={
          step === "new"
            ? "Avoid easy guesses like 1234 or your birth year."
            : undefined
        }
        error={error}
        disabled={busy}
        resetKey={step}
        onComplete={complete}
      />
    </Dialog>
  );
}
