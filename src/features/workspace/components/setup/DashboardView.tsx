// Shield → Surveillance Dashboard (legacy skillatracker-ui
// Surveillance/Serveillance, /Surveillance_dashboard): per-camera counts,
// recognitions and clips.
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { DataRecord } from "../../../../domain/contracts/types";
import { str } from "../../../../domain/common/text";
import { USER_TYPES } from "../../../../domain/surveillance/setup";
import { atCamera } from "../../../../domain/sources/setup";
import { useSettings } from "../../../../application/surveillanceSettings";
import { useTheme } from "../../../../shared/theme/Theme";
import { Badge, Button, Row, Txt } from "../../../../shared/ui/Primitives";
import { ChipSelect } from "../../../../shared/ui/Chip";
import { TabBar } from "../../../../shared/ui/TabBar";
import { MediaPlayer, RecordMedia } from "../RecordMedia";
import { PersonChip } from "../PersonChip";
import { Panel } from "./SettingsPanel";

const TYPES = [...USER_TYPES, "Unidentified"];

export function DashboardView({
  rows,
  cameras,
  clips,
}: {
  rows: DataRecord[];
  cameras: DataRecord[];
  clips: DataRecord[];
}) {
  const c = useTheme();
  const wide = useWindowDimensions().width >= 1100;
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"analytics" | "video">("analytics");
  // Legacy default: Unidentified is not selected.
  const [types, setTypes] = useState(["Identified", "Threat", "Visitor"]);
  const [now, setNow] = useState(new Date());
  const s = useSettings();
  useEffect(
    () => setActive((a) => Math.min(a, Math.max(cameras.length - 1, 0))),
    [cameras.length],
  );
  if (!cameras.length)
    return (
      <Panel title="Surveillance dashboard">
        <Txt size={13} color={c.muted}>
          Please configure a camera on the Camera Setup tab to view the data.
        </Txt>
      </Panel>
    );
  const cam = cameras[active];
  const here = rows.filter(
    (d, index, all) =>
      atCamera(d, cam) &&
      all.findIndex((other) =>
        ["uid", "name", "camera", "time", "type"].every(
          (key) => str(other.cells[key]) === str(d.cells[key]),
        ),
      ) === index,
  );
  const shown = here.filter((d) => types.includes(str(d.cells.type)));
  const count = (t: string) =>
    here.filter((d) => str(d.cells.type) === t).length;
  const on = str(cam.cells.status) === "Active";
  const camClips = clips.filter((v) =>
    atCamera({ ...v, cells: { camera: v.cells.camera } } as DataRecord, cam),
  );
  return (
    <View style={{ gap: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {cameras.map((x, i) => (
          <Pressable
            key={x.id}
            accessibilityRole="tab"
            accessibilityLabel={str(x.cells.display)}
            accessibilityState={{ selected: i === active }}
            onPress={() => setActive(i)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: i === active ? c.actionPrimary : c.border,
              backgroundColor: i === active ? c.actionPrimary : c.surface,
            }}
          >
            <Txt size={12} bold color={i === active ? c.actionInk : c.text}>
              {str(x.cells.display)}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Txt size={12} color={c.muted}>
          {"Updated " +
            now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Txt>
        <Button
          label="Refresh"
          icon="refresh"
          onPress={() => setNow(new Date())}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Total persons", here.length, c.text],
          ["Identified", count("Identified"), c.healthy],
          ["Unidentified", count("Unidentified"), c.attention],
          ["Threat", count("Threat"), c.critical],
          ["Visitor", count("Visitor"), c.link],
        ].map(([label, value, color]) => (
          <View
            key={label as string}
            style={{
              flexGrow: 1,
              flexBasis: 110,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              gap: 4,
            }}
          >
            <Txt size={12} color={c.muted}>
              {label as string}
            </Txt>
            <Txt size={20} bold color={color as string}>
              {String(value)}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 14 }}>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
          <Panel
            title={str(cam.cells.display)}
            subtitle={str(cam.cells.location)}
            action={
              <Badge
                label={on ? "ON" : "OFF"}
                tone={on ? "healthy" : "critical"}
              />
            }
          >
            {s.modules.video ? <MediaPlayer key={cam.id} record={cam} /> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                ["Brand", str(cam.cells.brand)],
                ["IP address", str(cam.cells.ip)],
                ["Camera ID", str(cam.cells.cameraId)],
                ["Start time", str(cam.cells.start)],
                ["End time", str(cam.cells.end)],
                ["Active days", str(cam.cells.days)],
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexGrow: 1,
                    flexBasis: 140,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: c.background,
                    gap: 2,
                  }}
                >
                  <Txt size={10} color={c.muted}>
                    {label}
                  </Txt>
                  <Txt size={12} bold>
                    {value || "—"}
                  </Txt>
                </View>
              ))}
            </View>
            {!on && (
              <Txt size={11} color={c.muted}>
                {str(cam.cells.state) || "Camera is not connected."}
              </Txt>
            )}
          </Panel>
        </View>
        <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
          <Panel
            title="Camera activity"
            subtitle={
              tab === "analytics"
                ? shown.length +
                  " recognition" +
                  (shown.length === 1 ? "" : "s") +
                  " at this camera"
                : "Recorded clips for this camera"
            }
            action={
              <TabBar
                label="Camera activity views"
                size="sm"
                tabs={[
                  { value: "analytics", label: "Analytics" },
                  { value: "video", label: "Video" },
                ]}
                value={tab}
                onChange={(view) => setTab(view as typeof tab)}
              />
            }
          >
            {tab === "analytics" ? (
              <>
                <ChipSelect
                  label="User type"
                  options={TYPES}
                  value={types}
                  onChange={setTypes}
                  optionLabel={(o) => `User type: ${o}`}
                />
                {shown.length ? (
                  <View style={{ gap: 0 }}>
                    {shown.map((d) => (
                      <Row
                        key={d.id}
                        style={{
                          gap: 16,
                          paddingVertical: 12,
                          borderTopWidth: 1,
                          borderColor: c.border,
                          alignItems: "center",
                        }}
                      >
                        <RecordMedia record={d} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <PersonChip
                            name={str(d.cells.name)}
                            uid={str(d.cells.uid) || undefined}
                            image={
                              (d.person as { image?: string } | undefined)
                                ?.image
                            }
                          />
                        </View>
                        <View
                          style={{
                            alignItems: "flex-end",
                            gap: 6,
                            maxWidth: 140,
                          }}
                        >
                          <Badge
                            label={str(d.cells.type)}
                            tone={d.state.tone}
                          />
                          <Txt size={12} color={c.muted}>
                            {str(d.cells.time)}
                          </Txt>
                        </View>
                      </Row>
                    ))}
                  </View>
                ) : (
                  <Txt size={12} color={c.muted}>
                    No recognitions at this camera for the selected user types.
                  </Txt>
                )}
              </>
            ) : camClips.length ? (
              camClips.map((v) => (
                <Row
                  key={v.id}
                  style={{
                    justifyContent: "space-between",
                    borderTopWidth: 1,
                    borderColor: c.border,
                    paddingTop: 10,
                  }}
                >
                  <Txt size={12}>
                    {str(v.cells.date)} · {str(v.cells.start)} ·{" "}
                    {str(v.cells.kind)}
                  </Txt>
                  <RecordMedia record={v} />
                </Row>
              ))
            ) : (
              <Txt size={12} color={c.muted}>
                No video available for this camera.
              </Txt>
            )}
          </Panel>
        </View>
      </View>
    </View>
  );
}
