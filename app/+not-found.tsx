import React from "react";
import { useRouter } from "expo-router";
import { EmptyState } from "../src/shared/ui/Primitives";
export default function NotFound() {
  const router = useRouter();
  return (
    <EmptyState
      title="This page isn't available"
      description="Return to your Vizenta workspace to continue."
      label="Open workspace"
      action={() => router.replace("/")}
    />
  );
}
