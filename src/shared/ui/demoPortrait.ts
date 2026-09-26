import type { ImageSourcePropType } from "react-native";
import { firstNameGender, parsePersonName, type PersonGender } from "../people/personName";
import { bundledPhotoOwner, portraitChoice } from "../people/portraits";
import { portraitImages } from "./portraitImages";

// Every demo person has one professional portrait from the shared pool
// (src/shared/people/portraits.ts). Uploaded photos keep their exact URI; the
// bundled dummy photos are replaced by the person's pool portrait.
export type DemoGender = PersonGender;

/** Demo-only presentation hint from the fictional first name, else the owner of a bundled dummy photo. */
export function demoGender(name?: string, image?: string): DemoGender | undefined {
  const person = name ? parsePersonName(name) : undefined;
  if (person?.gender) return person.gender;
  const first = (name ?? "").replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, "").split(/\s+/)[0];
  const byFirst = firstNameGender(first);
  if (byFirst) return byFirst;
  const owner = bundledPhotoOwner(image);
  return owner ? parsePersonName(owner)?.gender : undefined;
}

/**
 * Contract: the portrait to draw for a person. An uploaded photo URI wins; bundled dummy
 * photos and missing images resolve to the person's pool portrait. `size` (dp) picks the
 * thumbnail (<= 96) or the full-HD file. Undefined means show initials.
 */
export function portraitSource(
  name: string,
  options?: { image?: string; size?: number },
): ImageSourcePropType | undefined {
  const choice = portraitChoice(name, options);
  if (!choice) return undefined;
  if ("uri" in choice) return choice;
  return portraitImages[choice.id]?.[choice.file];
}

/** Pool portrait for a fictional person without an uploaded photo (full HD unless `size` <= 96). */
export function portraitFor(name: string, size?: number): ImageSourcePropType | undefined {
  return portraitSource(name, { size });
}

/**
 * Source for a stored profile image: an uploaded photo as is, a bundled dummy photo as the
 * person's pool portrait (the dummy's own owner when no name is given).
 */
export function demoPortrait(uri: string, name?: string, size?: number): ImageSourcePropType {
  return portraitSource(name ?? "", { image: uri, size }) ?? { uri };
}
