import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Icon } from "../../../shared/ui/Icon";
import { AuthArtwork } from "./AuthArtwork";
import { AuthUseCaseSelector } from "./AuthUseCaseSelector";
import type { AuthShowcaseState } from "../hooks/useAuthShowcase";
import { light as theme } from "../../../shared/theme/Theme";

export function AuthBrandPanel({
  showcase,
  compact = false,
  height,
}: {
  showcase: AuthShowcaseState;
  compact?: boolean;
  height?: number;
}) {
  const [size, setSize] = useState({ width: 600, height: 720 });
  const [controlFocused, setControlFocused] = useState(false);
  const short = size.height < 440;
  const inset = compact || short ? 20 : 32;
  const slide = showcase.slide;
  return (
    <View
      testID="auth-brand-panel"
      onLayout={(event) =>
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
      onPointerEnter={() => showcase.setHovered(true)}
      onPointerLeave={() => showcase.setHovered(false)}
      style={[
        s.panel,
        compact ? { height, marginHorizontal: -20 } : { flex: 1 },
      ]}
    >
      <AuthArtwork showcase={showcase} />
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="auth-photo-shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#08283f" stopOpacity="0.78" />
            <Stop offset="0.35" stopColor="#08283f" stopOpacity="0.04" />
            <Stop offset="0.6" stopColor="#08283f" stopOpacity="0.12" />
            <Stop
              offset="1"
              stopColor={compact ? "#fff" : "#08283f"}
              stopOpacity="0.98"
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auth-photo-shade)" />
      </Svg>
      <View
        style={[
          s.header,
          { top: compact ? 10 : inset, left: inset, right: inset },
        ]}
      >
        <Image
          testID="auth-image-logo"
          accessibilityLabel="Vizenta AI"
          source={require("../../../../assets/auth/vizenta-white.png")}
          resizeMode="contain"
          style={{
            width: compact || short ? 116 : 170,
            height: compact || short ? 36 : 50,
          }}
        />
        {!showcase.mobile && !showcase.reduced && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showcase.paused ? "Play slideshow" : "Pause slideshow"
            }
            onPress={showcase.toggle}
            onFocus={() => {
              setControlFocused(true);
              showcase.setFocused(true);
            }}
            onBlur={() => {
              setControlFocused(false);
              showcase.setFocused(false);
            }}
            style={({ pressed }) => [
              s.play,
              pressed && { opacity: 0.8 },
              controlFocused && s.focus,
            ]}
          >
            <Icon
              name={showcase.paused ? "play" : "pause"}
              size={17}
              color="#fff"
            />
          </Pressable>
        )}
      </View>
      {!compact && size.height >= 640 && (
        <>
          <View style={[s.callout, { left: inset, top: "14%" }]}>
            <Icon name="users" size={19} color="#78dcef" />
            <Text style={s.calloutTitle}>{slide.firstTitle}</Text>
            <Text style={s.calloutDetail}>{slide.firstDetail}</Text>
          </View>
          <View style={[s.callout, { right: inset, top: "43%" }]}>
            <Icon name="shield" size={19} color="#7ddbc9" />
            <Text style={s.calloutTitle}>{slide.secondTitle}</Text>
            <Text style={s.calloutDetail}>{slide.secondDetail}</Text>
          </View>
        </>
      )}
      <View
        style={{
          marginTop: "auto",
          paddingHorizontal: inset,
          paddingBottom: compact ? 10 : inset,
          gap: short ? 8 : 16,
        }}
      >
        {!showcase.mobile && (
          <AuthUseCaseSelector
            showcase={showcase}
            narrow={size.width < 520}
            compact={compact || short}
          />
        )}
        {!compact && (
          <>
            <Text
              testID="auth-slide-headline"
              style={[
                s.headline,
                (short || size.width < 440) && {
                  fontSize: short ? 25 : 31,
                  lineHeight: short ? 31 : 38,
                },
              ]}
            >
              {slide.headline}
              {"\n"}
              <Text style={{ color: "#78dcef" }}>In clear view.</Text>
            </Text>
            {!short && <Text style={s.description}>{slide.description}</Text>}
          </>
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  panel: { minWidth: 0, backgroundColor: theme.sidebar, overflow: "hidden" },
  header: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  play: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d3f3ff66",
    backgroundColor: "#0b2e4ccc",
  },
  focus: { borderColor: "#78dcef", borderWidth: 2 },
  callout: {
    position: "absolute",
    gap: 8,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d3f3ff55",
    backgroundColor: "#0b2e4ce6",
  },
  calloutTitle: { color: "#fff", fontFamily: "InterMedium", fontSize: 15 },
  calloutDetail: { color: "#c4dce9", fontFamily: "Inter", fontSize: 11 },
  headline: {
    color: "#ecf6fc",
    fontFamily: "InterBold",
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.7,
  },
  description: {
    color: "#d2e3ee",
    fontFamily: "Inter",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 410,
  },
});
