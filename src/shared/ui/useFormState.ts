import { useState } from "react";

/** True when `errors` holds a message anywhere: a flat record, or lists of them. */
function hasErrors(errors: unknown): boolean {
  if (typeof errors === "string") return errors.length > 0;
  return (
    !!errors &&
    typeof errors === "object" &&
    Object.values(errors).some(hasErrors)
  );
}

/**
 * State of a validated form. Errors are recomputed every render, so they also
 * follow outside inputs such as the names already taken. They show once the
 * form is submitted, or from the start with `reveal` (an edit shows what still
 * needs completing straight away). `submit(onValid)` is the submit handler: it
 * reveals the errors and calls `onValid` only when there are none.
 */
export function useFormState<T extends object, E extends object>(
  initial: T | (() => T),
  validate: (value: T) => E,
  { reveal = false }: { reveal?: boolean } = {},
) {
  const [value, setValue] = useState<T>(initial);
  const [submitted, setSubmitted] = useState(reveal);
  const errors = validate(value);
  return {
    value,
    setValue,
    /** Setter for one field: `set("email")(text)`. */
    set:
      <K extends keyof T>(key: K) =>
      (next: T[K]) =>
        setValue((current) => ({ ...current, [key]: next })),
    errors,
    submitted,
    /** A field's error once errors are shown. */
    err: <K extends keyof E>(key: K): E[K] | undefined =>
      submitted ? errors[key] : undefined,
    submit: (onValid: (value: T) => void) => () => {
      setSubmitted(true);
      if (!hasErrors(errors)) onValid(value);
    },
  };
}
