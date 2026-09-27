import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useApp } from "./AppProvider";
import {
  attemptsRemaining,
  cooldownFor,
  shouldLock,
} from "../domain/lock/policy";
import {
  biometricKinds as detectBiometrics,
  disabledLock,
  hashPin,
  loadLock,
  lockSupported,
  pinRecord,
  promptBiometrics,
  saveLock,
  type BiometricKind,
  type LockConfig,
} from "./appLock";

export type PinResult =
  { ok: true } | { ok: false; remaining: number; lockedUntil: number };
interface AppLockContext {
  supported: boolean;
  config: LockConfig;
  locked: boolean;
  biometricKinds: BiometricKind[];
  enable: (pin: string) => Promise<void>;
  changePin: (pin: string) => Promise<void>;
  disable: () => Promise<void>;
  setPreference: (
    patch: Partial<Pick<LockConfig, "biometrics" | "timeout">>,
  ) => Promise<void>;
  checkPin: (pin: string) => Promise<PinResult>;
  unlockWithBiometrics: () => Promise<boolean>;
  resetAndSignOut: () => Promise<void>;
}
const Context = createContext<AppLockContext>(null!);
export const useAppLock = () => useContext(Context);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const [config, setConfig] = useState(disabledLock);
  const [locked, setLocked] = useState(false);
  const [kinds, setKinds] = useState<BiometricKind[]>([]);
  const configRef = useRef(config);
  const sessionRef = useRef(app.session);
  const backgroundAt = useRef<number | null>(null);
  configRef.current = config;
  sessionRef.current = app.session;

  const persist = useCallback(
    async (next: LockConfig) => {
      setConfig(next);
      try {
        await saveLock(next);
      } catch {
        app.notify("App lock settings could not be saved on this device.");
      }
    },
    [app.notify],
  );
  const refreshBiometrics = useCallback(
    () => detectBiometrics().then(setKinds),
    [],
  );

  useEffect(() => {
    if (!lockSupported) return;
    loadLock()
      .then(setConfig)
      .catch(() => setConfig(disabledLock));
    refreshBiometrics();
  }, [refreshBiometrics]);

  useEffect(() => {
    if (!lockSupported) return;
    const subscription = AppState.addEventListener("change", (state) => {
      const { enabled, timeout } = configRef.current;
      if (!enabled || !sessionRef.current) return;
      if (state === "background") {
        backgroundAt.current = Date.now();
        // Cover the workspace before the OS captures the app switcher preview.
        if (timeout === 0) setLocked(true);
      } else if (state === "active" && backgroundAt.current !== null) {
        if (shouldLock(backgroundAt.current, Date.now(), timeout))
          setLocked(true);
        backgroundAt.current = null;
        // Enrolment may have changed in system settings while away.
        refreshBiometrics();
      }
    });
    return () => subscription.remove();
  }, [refreshBiometrics]);

  // Signing out ends the locked session; the next sign-in starts unlocked.
  useEffect(() => {
    if (!app.session) {
      setLocked(false);
      backgroundAt.current = null;
    }
  }, [app.session]);

  const enable = useCallback(
    async (pin: string) =>
      persist({
        ...configRef.current,
        ...(await pinRecord(pin)),
        enabled: true,
        failures: 0,
        lockedUntil: 0,
      }),
    [persist],
  );
  const disable = useCallback(async () => {
    setLocked(false);
    await persist(disabledLock);
  }, [persist]);
  const setPreference = useCallback(
    (patch: Partial<Pick<LockConfig, "biometrics" | "timeout">>) =>
      persist({ ...configRef.current, ...patch }),
    [persist],
  );
  const checkPin = useCallback(
    async (pin: string): Promise<PinResult> => {
      const current = configRef.current;
      if (Date.now() < current.lockedUntil)
        return { ok: false, remaining: 0, lockedUntil: current.lockedUntil };
      if ((await hashPin(pin, current.salt)) === current.pinHash) {
        if (current.failures || current.lockedUntil)
          await persist({ ...current, failures: 0, lockedUntil: 0 });
        setLocked(false);
        return { ok: true };
      }
      const failures = current.failures + 1;
      const wait = cooldownFor(failures);
      const lockedUntil = wait ? Date.now() + wait : 0;
      await persist({ ...current, failures, lockedUntil });
      return {
        ok: false,
        remaining: attemptsRemaining(failures),
        lockedUntil,
      };
    },
    [persist],
  );
  const unlockWithBiometrics = useCallback(async () => {
    const ok = await promptBiometrics("Unlock Vizenta AI");
    if (ok) setLocked(false);
    return ok;
  }, []);
  const resetAndSignOut = useCallback(async () => {
    await disable();
    app.update({ session: false });
  }, [disable, app.update]);

  const value = useMemo(
    () => ({
      supported: lockSupported,
      config,
      locked: locked && config.enabled && app.session,
      biometricKinds: kinds,
      enable,
      changePin: enable,
      disable,
      setPreference,
      checkPin,
      unlockWithBiometrics,
      resetAndSignOut,
    }),
    [
      config,
      locked,
      app.session,
      kinds,
      enable,
      disable,
      setPreference,
      checkPin,
      unlockWithBiometrics,
      resetAndSignOut,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
