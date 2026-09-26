import React, { useMemo, useState } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import type { Cell, DataRecord } from "../../../domain/contracts/types";
import { cellSecondary, cellText } from "../../../domain/contracts/logic";
import { userIdentity } from "../../../domain/contracts/userIdentity";
import {
  parsePersonName,
  type PersonName,
} from "../../../shared/people/personName";
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
}

// Tables re-render every cell on hover and paging; detection runs once per text.
const parsed = new Map<
  string,
  { person: PersonName; label: string; meta: string } | null
>();
function detect(text: string) {
  const parts = text.split(" · ").map((part) => part.trim());
  // "Name · UID" parses whole; "Rachel Kim · CSM" by its first segment. A
  // later segment is not the subject ("Parent visit · Neha Rao" is a parent).
  const person =
    parsePersonName(text) ??
    (parts.length > 1 ? parsePersonName(parts[0]) : undefined);
  if (!person) return null;
  const uid = person.uid;
  const rest = parts.filter(
    (part, i) => i > 0 && !(uid && (part === uid || part.endsWith(" " + uid))),
  );
  const label = parts[0].includes(person.name) ? parts[0] : person.name;
  return { person, label, meta: rest.join(" · ") };
}
/** The person a text names (memoised parsePersonName, whole text or first " · " segment). */
export function personIn(text: string): PersonName | undefined {
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
/** Chip props for a text or cell value that names a person, else undefined. */
export function personChip(
  text: string,
  secondary = "",
): PersonChipProps | undefined {
  const hit = personOf(text);
  if (!hit) return undefined;
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
 * The row's primary identity when it is a person: configured users and
 * learners always, other identity rows (visitors, shifts, crews, unknown
 * captures) only when their name is a person's.
 */
export function personIdentity(record: DataRecord) {
  const identity = userIdentity(record);
  if (!identity) return undefined;
  const setup = record.setup as { first_name?: string } | undefined;
  return record.person || setup?.first_name || personIn(identity.name)
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

const initialsOf = (name: string) =>
  personIn(name)?.initials ??
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
 * Circular portrait: an uploaded photo, else the person's pool portrait, else
 * initials. `decorative` hides it from assistive tech inside a labelled control.
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
    <Txt size={Math.max(11, Math.round(size / 3))} bold color={c.muted}>
      {initialsOf(name) || "?"}
    </Txt>
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

/** The standard person format: avatar, bold name and a muted "UID: …" line. */
export function PersonChip({
  name,
  label,
  uid,
  meta,
  image,
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
      <PersonAvatar name={name} image={image} size={size} />
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
