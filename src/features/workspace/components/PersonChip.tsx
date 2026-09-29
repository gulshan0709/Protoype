import React, { useId, useMemo, useState } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import type { Cell, DataRecord } from "../../../domain/contracts/types";
import { cellSecondary, cellText } from "../../../domain/contracts/logic";
import { userIdentity } from "../../../domain/contracts/userIdentity";
import {
  nameInitials,
  parsePersonName,
  parseTitledPerson,
  type PersonName,
} from "../../../shared/people/personName";
import {
  AVATAR_NEUTRAL,
  avatarGradient,
} from "../../../shared/people/avatarColors";
import { portraitSource } from "../../../shared/ui/demoPortrait";
import { useTheme } from "../../../shared/theme/Theme";
import { Row, Txt } from "../../../shared/ui/Primitives";

// Standard avatar sizes. Every person renders as the same circle + bold name +
// muted second line; only the size changes with the context.
/** Table cells, record cards, lists, dialogs and detail facts. */
export const PERSON_ROW = 38;
/** Record detail header. */
export const PERSON_HEADER = 72;
/** One-line mentions: timeline actors, the decision bar, the next-record pill. */
export const PERSON_INLINE = 28;

export interface PersonChipProps {
  /** Canonical name, used for the portrait and its accessibility label. */
  name: string;
  /** Text shown as the name when it differs, e.g. "Dr. Priya Nair". */
  label?: string;
  uid?: string;
  /** Rest of the source text, e.g. "CSM" or "10:00 · Finance". */
  meta?: string;
  image?: string;
  /** Everyone a list names ("Warden Rao, Priya Menon"): their avatars stack. */
  people?: { name: string; image?: string }[];
}

// Tables re-render every cell on hover and paging; detection runs once per text.
const parsed = new Map<
  string,
  { person: PersonName; label: string; meta: string } | null
>();
// A named person ("Kavita Rao") or one named by role and surname ("Warden Rao").
const parsePerson = (text: string) =>
  parsePersonName(text) ?? parseTitledPerson(text);
function detect(text: string) {
  const parts = text.split(" · ").map((part) => part.trim());
  // "Name · UID" parses whole; "Rachel Kim · CSM" by its first segment. A
  // later segment is not the subject ("Parent visit · Neha Rao" is a parent).
  const person =
    parsePerson(text) ?? (parts.length > 1 ? parsePerson(parts[0]) : undefined);
  if (!person) return null;
  const uid = person.uid;
  const rest = parts.filter(
    (part, i) => i > 0 && !(uid && (part === uid || part.endsWith(" " + uid))),
  );
  const label = parts[0].includes(person.name) ? parts[0] : person.name;
  return { person, label, meta: rest.join(" · ") };
}
/** The person a text names (memoised parse, whole text or first " · " segment). */
function personIn(text: string): PersonName | undefined {
  return personOf(text)?.person;
}
function personOf(text: string) {
  const key = String(text ?? "");
  let hit = parsed.get(key);
  if (hit === undefined) {
    if (parsed.size > 5000) parsed.clear();
    hit = detect(key);
    parsed.set(key, hit);
  }
  return hit ?? undefined;
}
/** Everyone a comma list names, when every entry is a person ("Warden Rao, Priya Menon"). */
function peopleIn(text: string) {
  const parts = String(text ?? "").split(/\s*,\s*/);
  if (parts.length < 2) return undefined;
  const hits = parts.map((part) => personOf(part));
  return hits.every(Boolean)
    ? (hits as NonNullable<(typeof hits)[number]>[])
    : undefined;
}
/** Chip props for a text or cell value that names a person (or a list of people), else undefined. */
export function personChip(
  text: string,
  secondary = "",
): PersonChipProps | undefined {
  const hit = personOf(text);
  if (!hit) {
    const group = peopleIn(text);
    if (!group) return undefined;
    return {
      name: group[0].person.name,
      label: group.map((p) => p.label).join(", "),
      meta: secondary || undefined,
      people: group.map((p) => ({ name: p.person.name })),
    };
  }
  const meta = [hit.meta, secondary].filter(Boolean).join(" · ");
  return {
    name: hit.person.name,
    label: hit.label !== hit.person.name ? hit.label : undefined,
    uid: hit.person.uid,
    meta: meta || undefined,
  };
}
/** Chip props for a table cell; skips the person the row's identity already shows. */
export function cellPerson(cell: Cell | undefined, shown?: { name: string }) {
  if (cell === undefined) return undefined;
  const chip = personChip(cellText(cell), cellSecondary(cell));
  return chip && chip.name !== shown?.name ? chip : undefined;
}
/**
 * The row's primary identity when it is a person: configured users, learners
 * and wardens always, other identity rows (visitors, shifts, crews, unknown
 * captures) only when their name is a person's.
 */
export function personIdentity(record: DataRecord) {
  const identity = userIdentity(record);
  if (!identity) return undefined;
  const setup = record.setup as { first_name?: string } | undefined;
  return record.person ||
    setup?.first_name ||
    record.type === "warden" ||
    personIn(identity.name)
    ? identity
    : undefined;
}
/** Chip props for a record about a person: its identity, else a person title. */
export function recordPerson(record: DataRecord): PersonChipProps | undefined {
  const identity = personIdentity(record);
  if (identity)
    return {
      name: identity.name,
      uid: identity.uid || undefined,
      image: identity.image,
    };
  return personChip(record.detail.title);
}

/** Gradient disc with the person's initials; a silhouette while there is no name. */
function InitialsAvatar({
  name,
  size,
  decorative,
}: {
  name: string;
  size: number;
  decorative?: boolean;
}) {
  const id = "vizenta-avatar-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const initials = nameInitials(name);
  const [from, to] = useMemo(
    () => (initials ? avatarGradient(name) : AVATAR_NEUTRAL),
    [name, initials],
  );
  // Two letters fill ~45% of the disc, one letter a little more.
  const fontSize = Math.max(
    10,
    Math.round(size * (initials.length > 1 ? 0.38 : 0.44)),
  );
  return (
    <View
      testID="person-initials"
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={
        decorative ? undefined : (name || "Person") + " initials"
      }
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Defs>
          <LinearGradient id={id + "-fill"} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
          <RadialGradient id={id + "-glow"} cx="30%" cy="18%" r="80%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id}-fill)`} />
        <Circle cx="50" cy="50" r="50" fill={`url(#${id}-glow)`} />
        <Circle
          cx="50"
          cy="50"
          r="48.5"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.22}
          strokeWidth={3}
        />
        {!initials && (
          <Path
            d="M50 27a13 13 0 1 1 0 26 13 13 0 0 1 0-26ZM24 80c2-14 13-21 26-21s24 7 26 21"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.92}
            strokeWidth={6}
            strokeLinecap="round"
          />
        )}
      </Svg>
      {!!initials && (
        <Txt
          size={fontSize}
          bold
          color="#FFFFFF"
          style={{
            lineHeight: Math.round(fontSize * 1.15),
            letterSpacing: initials.length > 1 ? size * 0.015 : 0,
            textAlign: "center",
            includeFontPadding: false,
            textShadowColor: "rgba(4, 22, 40, 0.28)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: Math.max(1, size / 24),
          }}
        >
          {initials}
        </Txt>
      )}
    </View>
  );
}
// Stable key for a source, so a failed image resets when the source changes.
const sourceKey = (source: ImageSourcePropType) =>
  typeof source === "number"
    ? "asset:" + source
    : Array.isArray(source)
      ? source.map((s) => s.uri).join("|")
      : String((source as { uri?: string }).uri);

function AvatarImage({
  source,
  label,
  size,
  fallback,
}: {
  source: ImageSourcePropType;
  label?: string;
  size: number;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <Image
      source={source}
      accessibilityLabel={label}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Circular portrait: an uploaded photo, else a demo person's pool portrait,
 * else gradient initials (also when the photo fails to load). `decorative`
 * hides it from assistive tech inside a labelled control.
 */
export function PersonAvatar({
  name,
  image,
  size,
  decorative,
}: {
  name: string;
  image?: string;
  size: number;
  decorative?: boolean;
}) {
  const c = useTheme();
  const source = useMemo(
    () => portraitSource(name, { image, size }),
    [name, image, size],
  );
  const initials = (
    <InitialsAvatar name={name} size={size} decorative={decorative} />
  );
  return (
    <View
      aria-hidden={decorative || undefined}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        flexShrink: 0,
        backgroundColor: c.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {source ? (
        <AvatarImage
          key={sourceKey(source)}
          source={source}
          label={decorative ? undefined : name + " profile image"}
          size={size}
          fallback={initials}
        />
      ) : (
        initials
      )}
    </View>
  );
}

/**
 * Overlapping avatars for a list of people, each ringed in the surface colour;
 * past three, the last place shows "+N". Decorative: the names are in the text.
 */
function AvatarStack({
  people,
  size,
}: {
  people: { name: string; image?: string }[];
  size: number;
}) {
  const c = useTheme();
  const shown = people.slice(0, people.length > 3 ? 2 : 3);
  const more = people.length - shown.length;
  const ring = Math.max(2, Math.round(size / 18));
  const inner = size - ring * 2;
  const disc = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring,
    borderColor: c.surface,
  };
  return (
    <View
      testID="person-avatar-stack"
      style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}
    >
      {shown.map((person, i) => (
        <View
          key={person.name + i}
          style={[
            disc,
            { marginLeft: i ? -Math.round(size * 0.3) : 0, zIndex: 9 - i },
          ]}
        >
          <PersonAvatar
            name={person.name}
            image={person.image}
            size={inner}
            decorative
          />
        </View>
      ))}
      {more > 0 && (
        <View
          aria-hidden
          style={[
            disc,
            {
              marginLeft: -Math.round(size * 0.3),
              backgroundColor: c.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Txt
            size={Math.max(10, Math.round(inner * 0.36))}
            bold
            color={c.link}
          >
            {"+" + more}
          </Txt>
        </View>
      )}
    </View>
  );
}

/** The standard person format: avatar, bold name and a muted "UID: …" line. */
export function PersonChip({
  name,
  label,
  uid,
  meta,
  image,
  people,
  size = PERSON_ROW,
  align = "start",
}: PersonChipProps & { size?: number; align?: "start" | "end" }) {
  const c = useTheme();
  const detail = [uid ? "UID: " + uid : "", meta ?? ""]
    .filter(Boolean)
    .join(" · ");
  const end = align === "end";
  // Content-based growth (no flex basis 0), so the chip keeps its size in
  // wrapping rows and auto-height columns and truncates only when squeezed.
  return (
    <Row
      style={[
        { gap: 10, minWidth: 0, flexGrow: 1, flexShrink: 1 },
        end && { justifyContent: "flex-end" },
      ]}
    >
      {people && people.length > 1 ? (
        <AvatarStack people={people} size={size} />
      ) : (
        <PersonAvatar name={name} image={image} size={size} />
      )}
      <View
        style={{ minWidth: 0, gap: 3, flexGrow: end ? 0 : 1, flexShrink: 1 }}
      >
        <Txt bold size={size >= 56 ? 22 : 13} lines={1}>
          {label || name}
        </Txt>
        {!!detail && (
          <Txt size={12} color={c.muted} lines={1}>
            {detail}
          </Txt>
        )}
      </View>
    </Row>
  );
}

/** A PersonChip when the record or text is about a person, else `children`. */
export function PersonOr({
  record,
  text,
  size,
  align,
  children,
}: {
  record?: DataRecord;
  text?: string;
  size?: number;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const person = record
    ? recordPerson(record)
    : text
      ? personChip(text)
      : undefined;
  return person ? (
    <PersonChip {...person} size={size} align={align} />
  ) : (
    <>{children}</>
  );
}
