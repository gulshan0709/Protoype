import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { useReducedMotion } from "../../../shared/motion/MotionProvider";
import {
  AUTH_SLIDE_INTERVAL,
  authUseCases,
  type AuthUseCaseId,
} from "../model/authUseCases";

export function useAuthShowcase(mobile: boolean) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<AuthUseCaseId>("corporate");
  const [requested, setRequested] = useState<AuthUseCaseId>("corporate");
  const [loaded, setLoaded] = useState<Partial<Record<AuthUseCaseId, boolean>>>(
    {},
  );
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const update = () =>
      setActive(
        Platform.OS === "web"
          ? !document.hidden
          : AppState.currentState === "active",
      );
    update();
    const subscription = AppState.addEventListener("change", update);
    if (Platform.OS === "web")
      document.addEventListener("visibilitychange", update);
    return () => {
      subscription.remove();
      if (Platform.OS === "web")
        document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (loaded[requested]) setSelected(requested);
  }, [loaded, requested]);
  useEffect(() => {
    if (
      (!mobile && (paused || hovered || focused)) ||
      reduced ||
      !active ||
      !loaded[selected]
    )
      return;
    const timer = setTimeout(() => {
      const index = authUseCases.findIndex((slide) => slide.id === selected);
      for (let step = 1; step < authUseCases.length; step++) {
        const next = authUseCases[(index + step) % authUseCases.length].id;
        if (loaded[next]) {
          setRequested(next);
          break;
        }
      }
    }, AUTH_SLIDE_INTERVAL);
    return () => clearTimeout(timer);
  }, [selected, loaded, paused, reduced, hovered, focused, active, mobile]);
  const select = useCallback((id: AuthUseCaseId) => {
    setPaused(true);
    setRequested(id);
  }, []);
  const markLoaded = useCallback(
    (id: AuthUseCaseId) =>
      setLoaded((current) =>
        current[id] ? current : { ...current, [id]: true },
      ),
    [],
  );
  const toggle = useCallback(() => setPaused((value) => !value), []);
  return {
    selected,
    mobile,
    slide: authUseCases.find((slide) => slide.id === selected)!,
    select,
    markLoaded,
    paused,
    reduced,
    toggle,
    setHovered,
    setFocused,
  };
}
export type AuthShowcaseState = ReturnType<typeof useAuthShowcase>;
