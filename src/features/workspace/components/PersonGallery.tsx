import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  PAGE_DAYS,
  RETENTION_DAYS,
  captureHistory,
  latestCapture,
  rangeLabel,
  type CapturePage,
  type Direction,
  type PersonCapture,
} from "../../../domain/gate/captureHistory";
import {
  detectionKind,
  detectionStyles,
} from "../../../domain/contracts/detectionDemo";
import { userIdentity } from "../../../domain/contracts/userIdentity";
import type { DataRecord } from "../../../domain/contracts/types";
import { useTheme } from "../../../shared/theme/Theme";
import { Badge, Button, Row, Txt } from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Dialog } from "../../../shared/ui/Dialog";
import { demoPortrait, portraitSource } from "../../../shared/ui/demoPortrait";
import { CaptureFrame, FaceCapture, LOW_LIGHT, stillFor } from "./RecordMedia";
import { PersonChip } from "./PersonChip";
import { demoStills, type DemoStill } from "./demoCaptures";

const THUMB = 76;
const FILTERS = ["All", "In", "Out"] as const;
type Filter = (typeof FILTERS)[number];
const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * The camera view for a capture: the row's own still at the person's usual
 * gate, another still (stable per gate) at the others.
 */
function sceneAt(record: DataRecord, gate: string): DemoStill | undefined {
  const own = stillFor(record);
  if (!own || gate === latestCapture(record).gate) return own;
  const pool = demoStills.filter(
    (s) => s.gender === own.gender && s.id !== own.id,
  );
  return pool.length ? pool[hash(gate) % pool.length] : own;
}

/** One face crop in the grid: the capture's own framing, no scan animation. */
function FaceThumb({
  uri,
  name,
  capture,
  color,
  fallback,
}: {
  uri?: string;
  name: string;
  capture: PersonCapture;
  color: string;
  fallback?: DemoStill;
}) {
  const source = uri
    ? (portraitSource(name, { image: uri, size: THUMB }) ??
      demoPortrait(uri, name, THUMB))
    : fallback?.source;
  const { scale, x, y } = capture.framing;
  const edge = THUMB * 0.2;
  return (
    <View
      style={{
        width: THUMB,
        height: THUMB,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#071c2c",
      }}
    >
      {source && (
        <Image
          source={source}
          resizeMode="cover"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            transform: [
              { translateX: x * THUMB },
              { translateY: y * THUMB },
              { scale },
            ],
          }}
        />
      )}
      {capture.lowLight && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: LOW_LIGHT }]}
        />
      )}
      {uri &&
        (["tl", "tr", "bl", "br"] as const).map((corner) => (
          <View
            key={corner}
            pointerEvents="none"
            style={{
              position: "absolute",
              width: edge,
              height: edge,
              borderColor: color,
              ...(corner[0] === "t"
                ? { top: 8, borderTopWidth: 1.5 }
                : { bottom: 8, borderBottomWidth: 1.5 }),
              ...(corner[1] === "l"
                ? { left: 8, borderLeftWidth: 1.5 }
                : { right: 8, borderRightWidth: 1.5 }),
            }}
          />
        ))}
    </View>
  );
}

/**
 * Every capture of one person in one place: the opened image large, with its
 * face crop, camera view and gate event, and the person's other captures
 * beside it, grouped by day. Tap a capture (or use ← →) to view it. Only the
 * last PAGE_DAYS days load at first; earlier days load on request, so a busy
 * person's month of captures is never read at once.
 */
export function PersonGallery({ record }: { record: DataRecord }) {
  const c = useTheme();
  const { width, height } = useWindowDimensions();
  const phone = width < 768;
  const person = userIdentity(record);
  const name = person?.name ?? record.detail.title;
  const kind = detectionKind(record);
  const style = detectionStyles[kind];
  const [loaded, setLoaded] = useState<CapturePage>(() =>
    captureHistory(record),
  );
  const captures = useMemo(
    () => loaded.days.flatMap((d) => d.captures),
    [loaded],
  );
  const loadEarlier = () =>
    setLoaded((prev) => {
      if (!prev.hasMore) return prev;
      const page = captureHistory(record, { before: prev.next });
      return {
        days: [...prev.days, ...page.days],
        hasMore: page.hasMore,
        next: page.next,
      };
    });
  const [filter, setFilter] = useState<Filter>("All");
  const matches = (x: PersonCapture) =>
    filter === "All" || x.direction === filter;
  const shown = useMemo(
    () =>
      filter === "All"
        ? captures
        : captures.filter((x) => x.direction === filter),
    [captures, filter],
  );
  const [selectedId, setSelectedId] = useState(
    () => captures.find((x) => x.current)?.id ?? captures[0]?.id,
  );
  const selected = shown.find((x) => x.id === selectedId) ?? shown[0];
  const index = selected ? shown.indexOf(selected) : -1;
  const step = (delta: number) => {
    const next = shown[index + delta];
    pending.current = true;
    if (next) return setSelectedId(next.id);
    if (delta < 0 || !loaded.hasMore) return;
    // Stepping past the oldest loaded capture reads the days before it.
    let page: CapturePage = loaded;
    const extra: CapturePage["days"] = [];
    let found: PersonCapture | undefined;
    while (!found && page.hasMore) {
      page = captureHistory(record, { before: page.next });
      extra.push(...page.days);
      found = page.days.flatMap((d) => d.captures).find(matches);
    }
    setLoaded({
      days: [...loaded.days, ...extra],
      hasMore: page.hasMore,
      next: page.next,
    });
    if (found) setSelectedId(found.id);
  };
  // Where each thumbnail sits in the grid, so arrow moves can scroll to it.
  const grid = useRef<ScrollView>(null);
  const layout = useRef({
    days: new Map<string, number>(),
    rows: new Map<string, number>(),
    thumbs: new Map<string, { y: number; h: number }>(),
    top: 0,
    height: 0,
  });
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current || !selected) return;
    const { id, day } = selected;
    // Newly loaded days are measured a moment after they render.
    const timer = setTimeout(() => {
      pending.current = false;
      const at = layout.current;
      const thumb = at.thumbs.get(id);
      if (!thumb) return;
      const y = (at.days.get(day) ?? 0) + (at.rows.get(day) ?? 0) + thumb.y;
      if (y < at.top || y + thumb.h > at.top + at.height)
        grid.current?.scrollTo({ y: Math.max(0, y - 30), animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [selected?.id, loaded]);
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "ArrowRight") stepRef.current(1);
      else if (event.key === "ArrowLeft") stepRef.current(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // Every loaded calendar day, so a day without movement still shows.
  const days = loaded.days.map((d) => ({
    ...d,
    items: d.captures.filter(matches),
  }));
  const count = (f: Filter) =>
    f === "All"
      ? captures.length
      : captures.filter((x) => x.direction === f).length;
  const tone = (d: Direction) => (d === "In" ? "healthy" : "attention");
  const face = person?.image;
  const scene = selected ? sceneAt(record, selected.gate) : undefined;
  const faceSize = phone ? 104 : 188;
  return (
    <View testID="person-gallery" style={{ gap: 14 }}>
      <Row
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PersonChip name={name} uid={person?.uid || undefined} image={face} />
        <Txt size={12} color={c.muted}>
          {`${captures.length} captures · ${rangeLabel(loaded.days)}`}
        </Txt>
      </Row>
      {selected && (
        <View style={{ flexDirection: phone ? "column" : "row", gap: 14 }}>
          <View
            style={{
              flexDirection: phone ? "row" : "column",
              gap: 12,
              width: phone ? "100%" : faceSize,
            }}
          >
            {face && (
              <FaceCapture
                key={selected.id}
                uri={face}
                name={name}
                size={faceSize}
                color={style.color}
                framing={selected.framing}
                lowLight={selected.lowLight}
              />
            )}
            <View
              testID="person-gallery-selected"
              style={{ gap: 5, flex: phone ? 1 : undefined, minWidth: 0 }}
            >
              <Row style={{ gap: 6, flexWrap: "wrap" }}>
                <Badge
                  label={selected.direction}
                  tone={tone(selected.direction)}
                />
                {selected.current && (
                  <Badge label="This record" tone="complete" />
                )}
              </Row>
              <Txt size={15} bold>
                {`${selected.time} · ${selected.dayLabel}`}
              </Txt>
              <Txt size={12} color={c.muted}>
                {selected.camera}
              </Txt>
              <Txt size={12} bold color={style.color}>
                {`${style.label} · ${Math.round(selected.confidence * 100)}% match`}
              </Txt>
              {selected.lowLight && (
                <Txt size={11} color={c.subtle}>
                  Low-light capture
                </Txt>
              )}
            </View>
          </View>
          <View style={{ flex: phone ? undefined : 1, minWidth: 0, gap: 8 }}>
            {scene && (
              <View>
                <CaptureFrame still={scene} kind={kind} title={name} />
                {selected.lowLight && (
                  <View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      { borderRadius: 10, backgroundColor: LOW_LIGHT },
                    ]}
                  />
                )}
                {[-1, 1].map((delta) => {
                  const disabled = !shown[index + delta];
                  return (
                    <Pressable
                      key={delta}
                      accessibilityRole="button"
                      accessibilityLabel={
                        delta < 0 ? "Newer capture" : "Older capture"
                      }
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => step(delta)}
                      style={({ pressed }) => ({
                        position: "absolute",
                        top: "50%",
                        marginTop: -20,
                        ...(delta < 0 ? { left: 8 } : { right: 8 }),
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? "rgba(0,0,0,0.7)"
                          : "rgba(0,0,0,0.45)",
                        opacity: disabled ? 0.3 : 1,
                      })}
                    >
                      <View
                        style={{ transform: [{ scaleX: delta < 0 ? -1 : 1 }] }}
                      >
                        <Icon name="chevron" size={20} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Row
              style={{
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Txt size={11} color={c.muted}>
                {`Capture ${index + 1} of ${shown.length}${loaded.hasMore ? "+" : ""} · camera view`}
              </Txt>
              {Platform.OS === "web" && (
                <Txt size={11} color={c.subtle}>
                  ← → to move · Esc to close
                </Txt>
              )}
            </Row>
          </View>
        </View>
      )}
      <View style={{ height: 1, backgroundColor: c.border }} />
      <Row
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <Txt size={14} bold>
          {`All captures of ${name}`}
        </Txt>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Show captures"
          style={{
            flexDirection: "row",
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {FILTERS.map((f, i) => (
            <Pressable
              key={f}
              accessibilityRole="radio"
              accessibilityLabel={`${f} captures`}
              accessibilityState={{ checked: filter === f }}
              aria-checked={filter === f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderLeftWidth: i ? 1 : 0,
                borderColor: c.border,
                backgroundColor: filter === f ? c.actionPrimary : c.surface,
              }}
            >
              <Txt
                size={12}
                bold={filter === f}
                color={filter === f ? c.actionInk : c.text}
              >
                {`${f} · ${count(f)}`}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Row>
      {/* The grid scrolls on its own so the viewer above stays in sight. */}
      <ScrollView
        ref={grid}
        testID="person-gallery-grid"
        nestedScrollEnabled
        scrollEventThrottle={32}
        onScroll={(e) => {
          layout.current.top = e.nativeEvent.contentOffset.y;
        }}
        onLayout={(e) => {
          layout.current.height = e.nativeEvent.layout.height;
        }}
        style={{
          maxHeight: Math.max(
            180,
            Math.min(phone ? 320 : 380, height - (phone ? 560 : 600)),
          ),
        }}
        contentContainerStyle={{ gap: 14, paddingBottom: 4 }}
      >
        {days.map((group) => (
          <View
            key={group.day}
            style={{ gap: 8 }}
            onLayout={(e) =>
              layout.current.days.set(group.day, e.nativeEvent.layout.y)
            }
          >
            <Row style={{ justifyContent: "space-between" }}>
              <Txt size={12} bold>
                {group.label}
              </Txt>
              <Txt size={11} color={c.muted}>
                {`${group.items.length} capture${group.items.length === 1 ? "" : "s"}`}
              </Txt>
            </Row>
            {group.items.length === 0 && (
              <Txt size={11} color={c.subtle}>
                {group.captures.length
                  ? `No ${filter} captures this day.`
                  : "No gate movement this day."}
              </Txt>
            )}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
              onLayout={(e) =>
                layout.current.rows.set(group.day, e.nativeEvent.layout.y)
              }
            >
              {group.items.map((x) => {
                const active = x.id === selected?.id;
                return (
                  <Pressable
                    key={x.id}
                    testID="person-gallery-thumb"
                    accessibilityRole="button"
                    accessibilityLabel={`${x.direction} at ${x.gate}, ${x.time} ${x.dayLabel}`}
                    accessibilityState={{ selected: active }}
                    aria-selected={active}
                    onPress={() => setSelectedId(x.id)}
                    onLayout={(e) =>
                      layout.current.thumbs.set(x.id, {
                        y: e.nativeEvent.layout.y,
                        h: e.nativeEvent.layout.height,
                      })
                    }
                    style={({ hovered }: any) => ({
                      width: THUMB + 4,
                      padding: 1,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: active
                        ? c.actionPrimary
                        : hovered
                          ? c.border
                          : "transparent",
                      gap: 4,
                    })}
                  >
                    <FaceThumb
                      uri={face}
                      name={name}
                      capture={x}
                      color={style.color}
                      fallback={sceneAt(record, x.gate)}
                    />
                    <Row style={{ gap: 4, paddingHorizontal: 2 }}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            x.direction === "In" ? c.healthy : c.attention,
                        }}
                      />
                      <Txt size={11} bold={active}>
                        {`${x.direction} ${x.time}`}
                      </Txt>
                    </Row>
                    {x.current && (
                      <Txt
                        size={10}
                        color={c.link}
                        style={{ paddingHorizontal: 2 }}
                      >
                        This record
                      </Txt>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ alignItems: "center", gap: 6, paddingTop: 2 }}>
          {loaded.hasMore ? (
            <>
              <Button
                compact
                testID="person-gallery-load-more"
                label={`Load ${PAGE_DAYS} earlier days`}
                icon="down"
                onPress={loadEarlier}
              />
              <Txt size={11} color={c.muted}>
                {`Showing ${rangeLabel(loaded.days)} · captures are kept for ${RETENTION_DAYS} days`}
              </Txt>
            </>
          ) : (
            <Txt size={11} color={c.muted}>
              {`Start of the ${RETENTION_DAYS}-day capture history.`}
            </Txt>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function PersonGalleryDialog({
  record,
  onClose,
}: {
  record: DataRecord;
  onClose: () => void;
}) {
  const name = userIdentity(record)?.name ?? record.detail.title;
  return (
    <Dialog title={`Captures · ${name}`} onClose={onClose} wide>
      <PersonGallery record={record} />
    </Dialog>
  );
}
