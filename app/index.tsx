import { useEffect, useState } from "react";
import { useIsFocused } from "expo-router";
import { Freeze } from "react-freeze";
import WorkspaceScreen from "../src/features/workspace/WorkspaceScreen";

// Every tab, record and metric is a pushed route, and on web the Stack keeps
// earlier screens mounted (hidden). Freeze them so an app change re-renders
// only the visible one. A blurred screen freezes one commit later, so a
// `go(); close();` still closes its dialog, and thaws as soon as it is
// focused again, with its state intact for Back.
export default function WorkspaceRoute() {
  const focused = useIsFocused();
  const [blurred, setBlurred] = useState(false);
  useEffect(() => {
    setBlurred(!focused);
  }, [focused]);
  return (
    <Freeze freeze={!focused && blurred}>
      <WorkspaceScreen />
    </Freeze>
  );
}
