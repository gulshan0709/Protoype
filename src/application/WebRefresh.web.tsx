import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { RefreshIndicator } from "./RefreshIndicator.web";

const refreshKey = "_vizenta_refresh";

function refresh() {
  const url = new URL(window.location.href);
  // A new document URL bypasses a stale HTML response on static hosts too.
  url.searchParams.set(refreshKey, Date.now().toString());
  window.location.replace(url.href);
}

function atTop(target: HTMLElement) {
  for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    if (node.scrollTop > 1) return false;
  }
  return window.scrollY <= 1;
}

export function WebRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reloadStarted = useRef(false);
  const paintFrame = useRef(0);
  const startRefresh = useCallback(() => {
    if (reloadStarted.current) return;
    reloadStarted.current = true;
    setRefreshing(true);
    // Let the loading state paint before navigation starts. No artificial delay.
    paintFrame.current = requestAnimationFrame(() => {
      paintFrame.current = requestAnimationFrame(refresh);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(paintFrame.current), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(refreshKey)) {
      url.searchParams.delete(refreshKey);
      window.history.replaceState(window.history.state, "", url.href);
    }
  }, []);

  useEffect(() => {
    let gesture: {
      x: number;
      y: number;
      target: HTMLElement;
      distance: number;
    } | null = null;
    let reloading = false;
    const cancel = () => {
      gesture = null;
      setPull(0);
    };
    const start = (event: TouchEvent) => {
      cancel();
      const target = event.target;
      if (
        reloading ||
        event.touches.length !== 1 ||
        !(target instanceof HTMLElement)
      )
        return;
      if (
        document.querySelector(
          '[aria-modal="true"], [data-testid="dialog-transition"], [data-testid="launch-screen"]',
        )
      )
        return;
      if (
        target.closest(
          'input, textarea, select, button, a, [role="button"], [contenteditable="true"], video',
        )
      )
        return;
      if (!atTop(target)) return;
      gesture = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        target,
        distance: 0,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1) return cancel();
      const dx = Math.abs(event.touches[0].clientX - gesture.x);
      const dy = event.touches[0].clientY - gesture.y;
      if (dy < 0 || (dx > 12 && dx > dy) || !atTop(gesture.target))
        return cancel();
      if (dy < 12) {
        gesture.distance = 0;
        setPull(0);
        return;
      }
      if (!event.cancelable) return cancel();
      event.preventDefault();
      gesture.distance = Math.min(dy, 150);
      setPull(gesture.distance);
    };
    const end = () => {
      const ready = gesture && gesture.distance >= 90;
      cancel();
      if (ready && !reloading) {
        reloading = true;
        startRefresh();
      }
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", cancel);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
    };
  }, [startRefresh]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10000,
        alignItems: "center",
      }}
    >
      <RefreshIndicator pull={pull} refreshing={refreshing} />
    </View>
  );
}
