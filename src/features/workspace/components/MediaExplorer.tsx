import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import {
  LEVELS,
  MEDIA_ROOT,
  MEDIA_SOURCE_LABEL,
  activeLevel,
  describe,
  describeSlot,
  findCamera,
  folderStat,
  formatCount,
  listFolders,
  prefixFor,
  resolveSelection,
  type MediaLevel,
  type MediaLevelKey,
  type MediaSelection,
} from "../../../domain/media/explorer";
import { useTheme } from "../../../shared/theme/Theme";
import {
  Badge,
  Button,
  Card,
  Divider,
  Field,
  Row,
  Txt,
} from "../../../shared/ui/Primitives";
import { Icon } from "../../../shared/ui/Icon";
import { Chip } from "../../../shared/ui/Chip";
import { FrameGrid } from "./MediaFrameGrid";

const LEVEL_ICON: Record<MediaLevelKey, string> = {
  org: "building",
  camera: "camera",
  date: "calendar",
  slot: "clock",
};
const FRESH_FOR = 15 * 60000;
// One listing time per session, like the legacy folder cache: drilling down and
// back shows the same folders until Refresh (or 15 minutes) re-reads the store.
let sessionNow: Date | undefined;
const listingTime = () =>
  sessionNow && Date.now() - sessionNow.getTime() < FRESH_FOR
    ? sessionNow
    : (sessionNow = new Date());

/**
 * Camera Media Explorer (skillatracker-ui-demo /media_explorer): drill from
 * customer to camera, date and half-hour slot, then browse every frame. The
 * selection lives in the route, so a camera-hour can be linked and Back goes
 * up one level.
 */
export function MediaExplorer({
  scope,
  selection,
  onSelect,
  notify,
}: {
  scope: string;
  selection: MediaSelection;
  onSelect: (next: MediaSelection) => void;
  notify: (text: string) => void;
}) {
  const c = useTheme();
  const phone = useWindowDimensions().width < 768;
  const [now, setNow] = useState(listingTime);
  const [count, setCount] = useState({ loaded: 0, hasMore: false });
  const { org, camera, date, slot } = selection;
  const at = useMemo(
    () => resolveSelection({ org, camera, date, slot }, scope, now),
    [org, camera, date, slot, scope, now],
  );
  const level = activeLevel(at);
  const items = useMemo(
    () => (level ? listFolders(at, scope, now) : []),
    [at, level, scope, now],
  );
  const slots = useMemo(
    () => (level ? [] : listFolders({ ...at, slot: undefined }, scope, now)),
    [at, level, scope, now],
  );
  const described = (key: MediaLevelKey) => describe(key, at[key]!, at, now);
  const contextLine = LEVELS.filter((l) => at[l.key])
    .map((l) => {
      const info = described(l.key);
      return info.range || info.label;
    })
    .join("  ·  ");
  /** Breadcrumb: keep everything above the clicked level and choose it again. */
  const goUpTo = (key: MediaLevelKey) => {
    const next: MediaSelection = {};
    for (const l of LEVELS) {
      if (l.key === key) break;
      next[l.key] = at[l.key];
    }
    onSelect(next);
  };
  const refresh = () => {
    sessionNow = new Date();
    setNow(sessionNow);
    notify("Frame store re-read");
  };
  const crumbs: { key: MediaLevelKey | "root"; label: string; hint: string }[] =
    [
      { key: "root", label: MEDIA_ROOT, hint: MEDIA_SOURCE_LABEL },
      ...LEVELS.filter((l) => at[l.key]).map((l) => {
        const info = described(l.key);
        return { key: l.key, label: info.range || info.label, hint: l.label };
      }),
    ];
  const cam = level ? undefined : findCamera(at);
  return (
    <View testID="media-explorer" style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <Row
          style={{
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Row
            style={{
              flex: 1,
              minWidth: phone ? "100%" : 280,
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            <Icon name="folder" size={16} color={c.subtle} />
            {crumbs.map((crumb, i) => {
              // The root while choosing a customer and the slot at the leaf are where you are.
              const here =
                (crumb.key === "root" && !at.org) ||
                (crumb.key === "slot" && !level);
              return (
                <React.Fragment key={crumb.key}>
                  {i > 0 && <Icon name="chevron" size={14} color={c.subtle} />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${crumb.hint}: ${crumb.label}`}
                    accessibilityState={{ disabled: here }}
                    disabled={here}
                    onPress={() =>
                      goUpTo(crumb.key === "root" ? "org" : crumb.key)
                    }
                    style={({ hovered }) => ({
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: here
                        ? c.primarySoft
                        : hovered
                          ? c.background
                          : "transparent",
                    })}
                  >
                    <Txt size={13} bold={here} color={here ? c.text : c.link}>
                      {crumb.label}
                    </Txt>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </Row>
          <Row style={{ gap: 8 }}>
            <Badge label={MEDIA_SOURCE_LABEL} tone="healthy" />
            <Button compact label="Refresh" icon="refresh" onPress={refresh} />
          </Row>
        </Row>
        <Divider />
        {/* The four fields, always spelled out: on a wall of near-identical
            frames, "which camera is this?" is the question that matters. */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: phone ? 12 : 24,
          }}
        >
          {LEVELS.map((l) => {
            const info = at[l.key] ? described(l.key) : undefined;
            return (
              <FieldValue
                key={l.key}
                label={l.label}
                value={info ? info.range || info.label : "— not selected —"}
                sub={info?.sub}
                badge={info?.badge}
                empty={!info}
                phone={phone}
              />
            );
          })}
          {!level && (
            <FieldValue
              label="Frames"
              value={`${formatCount(count.loaded)}${count.hasMore ? "+" : ""} loaded`}
              sub={count.hasMore ? "More on demand" : "Whole slot"}
              phone={phone}
            />
          )}
        </View>
      </Card>
      {level ? (
        <FolderLevel
          key={level.key}
          level={level}
          items={items}
          selection={at}
          now={now}
          phone={phone}
          onPick={(value) => onSelect({ ...at, [level.key]: value })}
        />
      ) : (
        cam && (
          <>
            <SlotRail
              slots={slots}
              current={at.slot!}
              onPick={(value) => onSelect({ ...at, slot: value })}
            />
            <FrameGrid
              key={`${prefixFor(at)}@${now.getTime()}`}
              selection={at}
              scope={scope}
              now={now}
              contextLine={contextLine}
              onCount={setCount}
            />
          </>
        )
      )}
    </View>
  );
}

function FieldValue({
  label,
  value,
  sub,
  badge,
  empty,
  phone,
}: {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  empty?: boolean;
  phone: boolean;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        gap: 2,
        minWidth: phone ? "44%" : 150,
        flexGrow: phone ? 1 : 0,
        flexShrink: 1,
      }}
    >
      <Txt size={10} bold color={c.subtle} style={{ letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Txt>
      <Row style={{ gap: 6, flexWrap: "wrap" }}>
        <Txt size={14} bold color={empty ? c.subtle : c.text}>
          {value}
        </Txt>
        {!!badge && <Badge label={badge} tone="complete" />}
      </Row>
      {!!sub && (
        <Txt size={11} color={c.muted}>
          {sub}
        </Txt>
      )}
    </View>
  );
}

/**
 * One rung of the drill-down: every folder under the current prefix as a card.
 * These lists are short, so they are plain views; only frames are windowed.
 */
function FolderLevel({
  level,
  items,
  selection,
  now,
  phone,
  onPick,
}: {
  level: MediaLevel;
  items: string[];
  selection: MediaSelection;
  now: Date;
  phone: boolean;
  onPick: (value: string) => void;
}) {
  const c = useTheme();
  const [query, setQuery] = useState("");
  // Days and slots are chronological and read best newest first; customers
  // and cameras are listed by name.
  const timeline = level.key === "date" || level.key === "slot";
  const [reversed, setReversed] = useState(timeline);
  const [width, setWidth] = useState(0);
  const rows = useMemo(() => {
    const all = items.map((raw) => ({
      raw,
      ...describe(level.key, raw, selection, now),
      stat: folderStat(selection, level.key, raw, now),
    }));
    const term = query.trim().toLowerCase();
    const found = term
      ? all.filter((row) =>
          [row.raw, row.label, row.range, row.sub, row.stat]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : all;
    const ordered = timeline
      ? found
      : [...found].sort((a, b) => a.label.localeCompare(b.label));
    return reversed ? [...ordered].reverse() : ordered;
  }, [items, level.key, selection, now, query, timeline, reversed]);
  const gap = 12;
  const columns = Math.max(1, Math.floor((width + gap) / (240 + gap)));
  const cardWidth = width
    ? (width - gap * (columns - 1)) / columns - 0.5
    : "100%";
  const noun = (n: number) =>
    (n === 1 ? level.label : level.plural).toLowerCase();
  return (
    <View style={{ gap: 12 }}>
      <Row
        style={{ flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}
      >
        <Row style={{ gap: 8 }}>
          <Txt size={15} bold>
            {`Pick ${/^[aeiou]/i.test(level.label) ? "an" : "a"} ${level.label.toLowerCase()}`}
          </Txt>
          <Badge label={`${formatCount(rows.length)} ${noun(rows.length)}`} />
        </Row>
        <Row style={{ gap: 8, flexGrow: phone ? 1 : 0 }}>
          <View
            style={{
              flex: phone ? 1 : undefined,
              width: phone ? undefined : 240,
            }}
          >
            <Field
              value={query}
              onChange={setQuery}
              placeholder={`Search ${level.plural.toLowerCase()}`}
            />
          </View>
          <Button
            compact
            label={
              timeline
                ? reversed
                  ? "Newest first"
                  : "Oldest first"
                : reversed
                  ? "Z–A"
                  : "A–Z"
            }
            icon="sort"
            onPress={() => setReversed((value) => !value)}
          />
        </Row>
      </Row>
      {rows.length === 0 ? (
        <Card style={{ padding: 28, alignItems: "center" }}>
          <Txt color={c.muted} style={{ textAlign: "center" }}>
            {query
              ? `No ${level.plural.toLowerCase()} match “${query}”.`
              : `No ${level.plural.toLowerCase()} found in this folder.`}
          </Txt>
        </Card>
      ) : (
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", flexWrap: "wrap", gap }}
        >
          {rows.map((row) => {
            const inactive = row.stat.startsWith("Not active");
            return (
              <Pressable
                key={row.raw}
                testID="media-folder"
                accessibilityRole="button"
                accessibilityLabel={`Open ${level.label.toLowerCase()} ${row.range || row.label}`}
                onPress={() => onPick(row.raw)}
                style={({ pressed, hovered }) => ({
                  width: cardWidth,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: hovered ? c.link : c.border,
                  backgroundColor: pressed ? c.primarySoft : c.surface,
                  transform: [{ translateY: hovered ? -1 : 0 }],
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: c.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={LEVEL_ICON[level.key]} size={18} color={c.link} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Row style={{ gap: 6 }}>
                    <Txt size={13} bold lines={2}>
                      {row.range || row.label}
                    </Txt>
                    {!!row.badge && <Badge label={row.badge} tone="complete" />}
                  </Row>
                  <Txt size={11} color={c.muted} lines={1}>
                    {row.sub || row.raw}
                  </Txt>
                  {!!row.stat && (
                    <Txt
                      size={11}
                      color={inactive ? c.attention : c.subtle}
                      lines={1}
                    >
                      {row.stat}
                    </Txt>
                  )}
                </View>
                <Icon name="chevron" size={16} color={c.subtle} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Every slot of the day in a strip, to walk the timeline without going back up. */
function SlotRail({
  slots,
  current,
  onPick,
}: {
  slots: string[];
  current: string;
  onPick: (slot: string) => void;
}) {
  const c = useTheme();
  const rail = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  return (
    <ScrollView
      ref={rail}
      horizontal
      testID="media-slot-rail"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 6,
        alignItems: "center",
        paddingVertical: 2,
      }}
    >
      <Txt size={11} color={c.muted} style={{ paddingRight: 4 }}>
        Time slots:
      </Txt>
      {slots.map((value) => {
        const info = describeSlot(value);
        const active = value === current;
        return (
          <Chip
            key={value}
            label={info.label}
            accessibilityLabel={`Time slot ${info.range}`}
            selected={active}
            disabled={active}
            onLayout={(e) => {
              // Bring the open slot into view once, so the rail starts where you are.
              if (!active || scrolled.current) return;
              scrolled.current = true;
              rail.current?.scrollTo({
                x: Math.max(0, e.nativeEvent.layout.x - 80),
                animated: false,
              });
            }}
            onPress={() => onPick(value)}
          />
        );
      })}
    </ScrollView>
  );
}
