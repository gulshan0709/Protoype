import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Txt } from "../shared/ui/Primitives";
import { useTheme } from "../shared/theme/Theme";

const buildId = process.env.EXPO_PUBLIC_VIZENTA_BUILD_ID;
const baseUrl = process.env.EXPO_PUBLIC_VIZENTA_BASE_URL || "";
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
  const theme = useTheme();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(refreshKey)) {
      url.searchParams.delete(refreshKey);
      window.history.replaceState(window.history.state, "", url.href);
    }
    if (!buildId) return;
    let disposed = false;
    let pending = false;
    const controller = new AbortController();
    const check = async () => {
      if (document.visibilityState !== "visible" || pending) return;
      pending = true;
      try {
        const response = await fetch(
          `${baseUrl}/version.json?t=${Date.now()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const version = await response.json();
        if (
          !disposed &&
          typeof version.id === "string" &&
          version.id !== buildId
        )
          setUpdateAvailable(true);
      } catch {
        // Offline or mid-deployment: keep the current app usable and retry later.
      } finally {
        pending = false;
      }
    };
    void check();
    const interval = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
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
        setRefreshing(true);
        refresh();
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
  }, []);

  if (!pull && !refreshing && !updateAvailable) return null;
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
      {pull > 0 || refreshing ? (
        <View
          testID="pull-refresh-status"
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 14,
          }}
        >
          <Txt>
            {refreshing
              ? "Refreshing…"
              : pull >= 90
                ? "Release to refresh"
                : "Pull to refresh"}
          </Txt>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New version available. Refresh app"
          onPress={refresh}
          style={{
            backgroundColor: theme.actionPrimary,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <Txt color={theme.actionInk}>New version available · Refresh</Txt>
        </Pressable>
      )}
    </View>
  );
}
