import type { DataRecord } from "./types";
import { cellText } from "./logic";
import { fullName } from "../common/text";
import samples from "../surveillance/samples.json";
export interface PersonIdentity { name: string; uid: string; image?: string }
const identityKeys = new Set(["user", "learner", "person", "resident", "employee", "visitor", "warden", "name"]);
const profiles = Object.values(samples).flat().map((record) => record.setup);
/** Resolve person records without turning cases, rooms or other entities into users. */
export function userIdentity(record: DataRecord): PersonIdentity | undefined {
  const supplied = record.person as PersonIdentity | undefined;
  const firstKey = Object.keys(record.cells)[0];
  const setup = record.setup as { first_name?: string; last_name?: string; uid?: string; image?: string } | undefined;
  if (!supplied && !setup?.first_name && !identityKeys.has(firstKey)) return undefined;
  const raw = cellText(record.cells[firstKey]).split(" \u00b7 ");
  const name = supplied?.name || (setup ? fullName(setup) : "") || raw[0];
  const explicitUid = record.detail.facts.find((fact) => /^(UID|User ID|Learner ID|Employee ID)$/i.test(fact.label));
  const suffix = raw[1]?.replace(/^(UID|Badge)\s*/i, "");
  const uid = supplied?.uid || setup?.uid || (explicitUid ? cellText(explicitUid.value) : "") || (suffix && /^[A-Z]*-?\d[\w-]*$/i.test(suffix) ? suffix : "");
  const profile = profiles.find((p) => (uid ? p.uid === uid : fullName(p) === name));
  // A configured profile owns its image, including an explicitly removed image.
  const image = supplied?.image || setup?.image || (!record.setup && !supplied ? profile?.image : undefined);
  return { name, uid, image };
}
