// Colours for initials avatars. Pure: no React Native imports, so node tests can load it.
import { fnv1a } from "../../domain/common/hash";
import { parsePersonName } from "./personName";

/*
 * People without a photo show white initials on a gradient picked from the
 * name, so one person keeps the same colours on every page ("Dr. Gulshan
 * Kumar · E1001" and "Gulshan Kumar" match). Both stops of every pair are dark
 * enough for white text in the light and dark themes.
 */
export const AVATAR_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#1DA9CF", "#0A5F8A"], // cyan
  ["#20B39E", "#0A6A61"], // teal
  ["#6E78F0", "#3A3FB8"], // indigo
  ["#9A6CF0", "#5E34BF"], // violet
  ["#E86A94", "#B0305E"], // rose
  ["#EC8743", "#BF4A22"], // amber
  ["#34B27A", "#10744F"], // emerald
  ["#4C93EC", "#1F55BF"], // blue
  ["#C66ED3", "#8A339F"], // orchid
  ["#5A7EA6", "#223F66"], // slate
];
/** Neutral pair for an avatar without a name yet (a new form). */
export const AVATAR_NEUTRAL = AVATAR_GRADIENTS[AVATAR_GRADIENTS.length - 1];

const HONORIFIC = /^(?:Dr|Prof|Mr|Mrs|Ms|Mx)\.?\s+/i;

/** The avatar gradient for a name: stable across honorifics, UID suffixes and case. */
export function avatarGradient(name: string): readonly [string, string] {
  const text = String(name ?? "");
  const key = (
    parsePersonName(text)?.name ??
    text.split(" · ")[0].trim().replace(HONORIFIC, "")
  )
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!key) return AVATAR_NEUTRAL;
  return AVATAR_GRADIENTS[fnv1a(key) % AVATAR_GRADIENTS.length];
}
