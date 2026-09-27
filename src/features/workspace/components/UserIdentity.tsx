import { userIdentity } from "../../../domain/contracts/userIdentity";
import React from "react";
import type { DataRecord } from "../../../domain/contracts/types";
import { PersonChip, PERSON_ROW } from "./PersonChip";
/** A record's primary identity in the standard person format. */
export function UserIdentity({
  record,
  size = PERSON_ROW,
}: {
  record: DataRecord;
  size?: number;
}) {
  const person = userIdentity(record)!;
  return (
    <PersonChip
      name={person.name}
      uid={person.uid || undefined}
      image={person.image}
      size={size}
    />
  );
}
