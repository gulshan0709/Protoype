import React, { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { useApp } from "../../../application/AppProvider";
import { Icon } from "../../../shared/ui/Icon";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { useAuthShowcase } from "../hooks/useAuthShowcase";
import { AuthContent } from "./AuthContent";
import { MotionView } from "../../../shared/motion/MotionView";
import { light as theme } from "../../../shared/theme/Theme";

type Mode = "login" | "register" | "forgot-password";
const accent = theme.primary;
const ink = theme.text;
const muted = theme.muted;
const demoCode = "123456";

function Label({
  children,
  size = 14,
  bold = false,
  color = ink,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Text
      style={{
        fontFamily: bold ? "InterBold" : "Inter",
        fontSize: size,
        lineHeight: size * 1.5,
        color,
      }}
    >
      {children}
    </Text>
  );
}
function LinkButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Label color={theme.link} bold>
        {label}
      </Label>
    </Pressable>
  );
}
function Submit({ label, onPress }: { label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        s.submit,
        {
          backgroundColor: pressed
            ? theme.actionPrimaryPressed
            : hovered
              ? theme.actionPrimaryHover
              : theme.actionPrimary,
        },
      ]}
    >
      <Label size={15} color={theme.actionInk} bold>
        {label}
      </Label>
    </Pressable>
  );
}
function Input({
  label,
  value,
  onChangeText,
  secret = false,
  compact = false,
  ...props
}: TextInputProps & { label: string; secret?: boolean; compact?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: compact ? 66 : 70,
        gap: compact ? 4 : 8,
      }}
    >
      <Text style={[s.floatingLabel, { color: focused ? theme.link : ink }]}>
        {label}
      </Text>
      <View
        style={[
          s.field,
          {
            borderColor: focused ? accent : theme.border,
            backgroundColor: focused ? "#fff" : "#f7fbfe",
          },
        ]}
      >
        {(label === "User Id" || label.startsWith("Password")) && (
          <View style={{ paddingLeft: 14 }}>
            <Icon name={secret ? "lock" : "mail"} color="#7195ad" size={18} />
          </View>
        )}
        <TextInput
          {...props}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secret && !visible}
          autoCapitalize={props.autoCapitalize ?? "none"}
          placeholderTextColor="#637c92"
          style={[
            s.input,
            Platform.OS === "web"
              ? ({ outlineStyle: "none" } as unknown as TextStyle)
              : undefined,
          ]}
        />
        {secret && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            onPress={() => setVisible(!visible)}
            style={s.eye}
          >
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke={muted}
              strokeWidth={1.7}
            >
              <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
              <Circle cx={12} cy={12} r={3} />
              {!visible && <Path d="m3 3 18 18" />}
            </Svg>
          </Pressable>
        )}
      </View>
    </View>
  );
}
function Verification({
  kind,
  destination,
  value,
  onChange,
  onResend,
}: {
  kind: "Mobile" | "Email";
  destination: string;
  value: string[];
  onChange: (value: string[]) => void;
  onResend: () => void;
}) {
  const refs = useRef<(TextInput | null)[]>([]);
  return (
    <View style={s.verification}>
      <Label bold>{kind} Verification</Label>
      <Label color={muted} size={12}>
        {destination}
      </Label>
      <View style={{ flexDirection: "row", gap: 7, marginTop: 10 }}>
        {value.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              refs.current[i] = r;
            }}
            accessibilityLabel={`${kind} verification digit ${i + 1}`}
            value={digit}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            selectTextOnFocus
            style={s.otp}
            onChangeText={(raw) => {
              const digits = raw.replace(/\D/g, "").slice(0, 6);
              const next = [...value];
              if (!digits) next[i] = "";
              else
                digits.split("").forEach((d, offset) => {
                  if (i + offset < 6) next[i + offset] = d;
                });
              onChange(next);
              if (digits) refs.current[Math.min(i + digits.length, 5)]?.focus();
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && !digit && i > 0)
                refs.current[i - 1]?.focus();
            }}
          />
        ))}
      </View>
      <LinkButton
        label={`Resend ${kind.toLowerCase()} code`}
        onPress={onResend}
      />
    </View>
  );
}
export function Login({ mode = "login" }: { mode?: Mode }) {
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const showcase = useAuthShowcase(width < 890);
  const insets = useSafeAreaInsets();
  const isLogin = mode === "login";
  const landscape = isLogin && width >= 650 && height < 520;
  const desktop = width >= 890 || landscape;
  const [paneHeight, setPaneHeight] = useState(height);
  const availableHeight = Math.min(height, paneHeight || height);
  const compactLogin = isLogin && availableHeight < 740;
  const tinyLogin = isLogin && availableHeight < 620;
  const shortLogin = isLogin && availableHeight < 460;
  // A narrow pane this short occurs when the mobile keyboard is open.
  // Keep credentials and submit available; restore secondary content on dismissal.
  const focusLayout = shortLogin && !desktop;
  const panePadding = shortLogin ? 8 : compactLogin ? 12 : 24;
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState({
    first: "",
    middle: "",
    last: "",
    email: "",
    mobile: "",
    code: "+91",
    password: "",
    confirm: "",
  });
  const [remember, setRemember] = useState(true);
  const [mobileOtp, setMobileOtp] = useState(Array<string>(6).fill(""));
  const [emailOtp, setEmailOtp] = useState(Array<string>(6).fill(""));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const set = (key: keyof typeof fields) => (value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setError("");
  };
  const navigate = (next: Mode) => router.replace(`/${next}`);
  const enter = () => {
    app.update({
      session: true,
      rememberSession: remember,
      name:
        fields.first.trim() || fields.email.trim().split("@")[0] || app.name,
    });
    // Keep a requested workspace view when login is shown by its session gate.
    if (pathname !== "/") router.replace("/");
  };
  const validatePassword = () => {
    if (fields.password.length < 8)
      return "Use at least 8 characters for your password.";
    if (fields.password !== fields.confirm) return "Passwords do not match.";
    return "";
  };
  const submit = () => {
    setError("");
    setNotice("");
    if (mode === "login") {
      if (!fields.email.trim() || !fields.password) {
        setError("Enter your user ID and password.");
        return;
      }
      enter();
      return;
    }
    if (step === 0) {
      if (mode === "register" && !fields.first.trim()) {
        setError("Enter your first name.");
        return;
      }
      if (
        !/^\+\d{1,4}$/.test(fields.code) ||
        !/^\d{7,15}$/.test(fields.mobile.replace(/[\s-]/g, ""))
      ) {
        setError("Enter a valid country code and mobile number.");
        return;
      }
      if (mode === "register") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
          setError("Enter a valid email address.");
          return;
        }
        const invalid = validatePassword();
        if (invalid) {
          setError(invalid);
          return;
        }
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (
        mobileOtp.join("") !== demoCode ||
        (mode === "register" && emailOtp.join("") !== demoCode)
      ) {
        setError("Enter code 123456 in each verification field.");
        return;
      }
      if (mode === "forgot-password") {
        setStep(2);
        return;
      }
      setFields((f) => ({ ...f, password: "", confirm: "" }));
      setStep(3);
      return;
    }
    const invalid = validatePassword();
    if (invalid) {
      setError(invalid);
      return;
    }
    setFields((f) => ({ ...f, password: "", confirm: "" }));
    setStep(3);
  };
  const title =
    step === 3
      ? "You're all set!"
      : step === 1
        ? "Verify Your Identity"
        : mode === "register"
          ? "Create your account"
          : mode === "forgot-password"
            ? step === 2
              ? "Create New Password"
              : "Forgot Password?"
            : "Welcome back";
  const resend = (kind: "mobile" | "email") => {
    (kind === "mobile" ? setMobileOtp : setEmailOtp)(Array<string>(6).fill(""));
    setNotice(
      `${kind === "mobile" ? "Mobile" : "Email"} verification code: 123456.`,
    );
    setError("");
  };
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        padding: 0,
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          width: "100%",
          alignSelf: "center",
          backgroundColor: "#fff",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {desktop && <AuthBrandPanel showcase={showcase} />}
        <AuthContent
          fixed={isLogin}
          weight={landscape ? 1.4 : 1}
          onLayout={(event) => setPaneHeight(event.nativeEvent.layout.height)}
          spacing={{
            justifyContent: isLogin && !desktop ? "flex-start" : "center",
            paddingHorizontal: desktop && !compactLogin ? 40 : 20,
            paddingTop:
              isLogin && !desktop
                ? insets.top
                : Math.max(isLogin ? panePadding : 24, insets.top + 8),
            paddingBottom: Math.max(
              isLogin ? panePadding : 24,
              insets.bottom + 8,
            ),
          }}
        >
          <MotionView
            testID="auth-page-transition"
            sceneKey={`${mode}:${step}`}
            style={{
              width: "100%",
              maxWidth: mode === "login" && !shortLogin ? 440 : 510,
              alignSelf: "center",
              gap: isLogin
                ? shortLogin
                  ? 2
                  : tinyLogin
                    ? 4
                    : compactLogin
                      ? 10
                      : 20
                : 14,
            }}
          >
            {!desktop && isLogin && !shortLogin && (
              <AuthBrandPanel
                showcase={showcase}
                compact
                height={
                  tinyLogin
                    ? error
                      ? 140
                      : 160
                    : compactLogin
                      ? 160
                      : error
                        ? 200
                        : 240
                }
              />
            )}
            {!desktop && mode !== "login" && (
              <View
                style={{
                  backgroundColor: theme.sidebar,
                  padding: 8,
                  borderRadius: 6,
                  alignSelf: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Image
                  source={require("../../../../assets/auth/vizenta-white.png")}
                  accessibilityLabel="Vizenta AI"
                  resizeMode="contain"
                  style={{ width: 116, height: 34 }}
                />
              </View>
            )}
            <View
              style={{
                gap: 5,
                marginBottom: isLogin && !compactLogin ? 12 : 0,
              }}
            >
              {!tinyLogin && mode !== "login" && (
                <Text
                  style={{
                    fontFamily: "InterMedium",
                    fontSize: 10,
                    letterSpacing: 1.4,
                    color: "#59798f",
                    marginBottom: 4,
                  }}
                >
                  {mode === "register"
                    ? `GET STARTED  /  ${step === 0 ? "01 DETAILS" : step === 1 ? "02 VERIFY" : "03 COMPLETE"}`
                    : "ACCOUNT RECOVERY"}
                </Text>
              )}
              <Label size={tinyLogin ? 21 : 28} color={theme.sidebar} bold>
                {title}
              </Label>
              {mode === "login" && !tinyLogin && (
                <Label color={muted}>
                  Sign in to your Vizenta AI workspace.
                </Label>
              )}
              {mode === "register" && step === 0 && (
                <Label color={muted}>Enter your details to get started.</Label>
              )}
              {mode === "forgot-password" && step === 0 && (
                <Label color={muted}>
                  Enter your registered mobile number to continue.
                </Label>
              )}
              {step === 1 && (
                <Label color={muted}>Use code 123456 to continue.</Label>
              )}
            </View>
            {step === 3 ? (
              <>
                <View style={s.verification}>
                  <Icon name="check" color={accent} size={32} />
                  <Label>Return to login to continue to your workspace.</Label>
                </View>
                <Submit
                  label="Back to login"
                  onPress={() => navigate("login")}
                />
              </>
            ) : (
              <>
                {mode === "login" && (
                  <>
                    <View
                      style={{
                        flexDirection: shortLogin && desktop ? "row" : "column",
                        gap: tinyLogin ? 8 : compactLogin ? 12 : 20,
                      }}
                    >
                      <Input
                        compact={tinyLogin}
                        label="User Id"
                        placeholder="xyz@tech.com"
                        value={fields.email}
                        onChangeText={set("email")}
                        autoComplete="username"
                        returnKeyType="next"
                      />
                      <Input
                        compact={tinyLogin}
                        label="Password"
                        placeholder="Enter your password"
                        value={fields.password}
                        onChangeText={set("password")}
                        secret
                        autoComplete="current-password"
                        returnKeyType="go"
                        onSubmitEditing={submit}
                      />
                    </View>
                    <View
                      style={[
                        s.between,
                        focusLayout && { display: "none" },
                        compactLogin && { marginTop: 0, marginBottom: 0 },
                      ]}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel="Remember me"
                        accessibilityState={{ checked: remember }}
                        onPress={() => setRemember(!remember)}
                        style={s.remember}
                      >
                        <View
                          style={[
                            s.checkbox,
                            {
                              backgroundColor: remember ? accent : "#fff",
                              borderColor: remember ? accent : "#bfc3ce",
                            },
                          ]}
                        >
                          {remember && (
                            <Icon name="check" size={13} color="#fff" />
                          )}
                        </View>
                        <Label size={13}>Remember me</Label>
                      </Pressable>
                      <LinkButton
                        label="Forgot Password?"
                        onPress={() => navigate("forgot-password")}
                      />
                    </View>
                  </>
                )}
                {mode !== "login" && step === 0 && (
                  <>
                    {mode === "register" && (
                      <View
                        style={{
                          flexDirection: width < 360 ? "column" : "row",
                          gap: 10,
                        }}
                      >
                        <Input
                          label="First Name *"
                          autoCapitalize="words"
                          value={fields.first}
                          onChangeText={set("first")}
                        />
                        <Input
                          label="Middle Name"
                          autoCapitalize="words"
                          value={fields.middle}
                          onChangeText={set("middle")}
                        />
                        <Input
                          label="Last Name"
                          autoCapitalize="words"
                          value={fields.last}
                          onChangeText={set("last")}
                        />
                      </View>
                    )}
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ width: 90 }}>
                        <Input
                          label="Code"
                          value={fields.code}
                          onChangeText={set("code")}
                          keyboardType="phone-pad"
                          maxLength={5}
                        />
                      </View>
                      <Input
                        label="Mobile Number *"
                        value={fields.mobile}
                        onChangeText={set("mobile")}
                        keyboardType="phone-pad"
                        autoComplete="tel-national"
                      />
                    </View>
                    {mode === "register" && (
                      <Input
                        label="Email *"
                        placeholder="xyz@tech.com"
                        value={fields.email}
                        onChangeText={set("email")}
                        keyboardType="email-address"
                        autoComplete="email"
                      />
                    )}
                  </>
                )}
                {((mode === "register" && step === 0) ||
                  (mode === "forgot-password" && step === 2)) && (
                  <View
                    style={{
                      flexDirection: width >= 600 ? "row" : "column",
                      gap: 14,
                    }}
                  >
                    <Input
                      label="Password *"
                      placeholder="8 or more characters"
                      secret
                      value={fields.password}
                      onChangeText={set("password")}
                      autoComplete="new-password"
                    />
                    <Input
                      label="Confirm Password *"
                      placeholder="Confirm your password"
                      secret
                      value={fields.confirm}
                      onChangeText={set("confirm")}
                      autoComplete="new-password"
                      returnKeyType="go"
                      onSubmitEditing={submit}
                    />
                  </View>
                )}
                {mode !== "login" && step === 1 && (
                  <>
                    <Verification
                      kind="Mobile"
                      destination={`${fields.code} ${fields.mobile}`}
                      value={mobileOtp}
                      onChange={setMobileOtp}
                      onResend={() => resend("mobile")}
                    />
                    {mode === "register" && (
                      <Verification
                        kind="Email"
                        destination={fields.email}
                        value={emailOtp}
                        onChange={setEmailOtp}
                        onResend={() => resend("email")}
                      />
                    )}
                  </>
                )}
                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={[
                      s.error,
                      compactLogin && {
                        padding: 4,
                        fontSize: 11,
                        lineHeight: 16,
                      },
                    ]}
                  >
                    {error}
                  </Text>
                )}
                {!!notice && (
                  <Text accessibilityLiveRegion="polite" style={s.notice}>
                    {notice}
                  </Text>
                )}
                <Submit
                  label={
                    mode === "login"
                      ? "Sign in"
                      : step === 0
                        ? "Continue"
                        : step === 1
                          ? mode === "register"
                            ? "Create Account"
                            : "Verify code"
                          : "Reset Password"
                  }
                  onPress={submit}
                />
                {mode === "login" && (
                  <>
                    <View
                      style={[s.switch, focusLayout && { display: "none" }]}
                    >
                      <Label>Don't have an account?</Label>
                      <LinkButton
                        label="Signup here"
                        onPress={() => navigate("register")}
                      />
                    </View>
                  </>
                )}
                {mode === "register" && step === 0 && (
                  <>
                    <View style={s.switch}>
                      <Label>Already have an account?</Label>
                      <LinkButton
                        label="Login here"
                        onPress={() => navigate("login")}
                      />
                    </View>
                  </>
                )}
                {mode !== "login" && step > 0 && (
                  <LinkButton
                    label="Back to form"
                    onPress={() => {
                      setStep(0);
                      setError("");
                      setNotice("");
                      setMobileOtp(Array<string>(6).fill(""));
                      setEmailOtp(Array<string>(6).fill(""));
                    }}
                  />
                )}
                {mode === "forgot-password" && (
                  <LinkButton
                    label="Back to login"
                    onPress={() => navigate("login")}
                  />
                )}
              </>
            )}
            {mode === "login" && (
              <View
                style={[
                  s.workspaceEntry,
                  focusLayout && { display: "none" },
                  compactLogin && { paddingTop: 4 },
                ]}
              >
                <LinkButton label="Explore workspace" onPress={enter} />
              </View>
            )}
          </MotionView>
        </AuthContent>
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  field: {
    flexDirection: "row",
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  floatingLabel: {
    fontFamily: "InterMedium",
    fontSize: 13,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Inter",
    color: ink,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    outlineWidth: 0,
  },
  eye: { padding: 12 },
  submit: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  between: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    marginTop: -10,
    marginBottom: -8,
  },
  remember: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switch: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  workspaceEntry: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
    alignItems: "center",
    gap: 3,
  },
  verification: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.primarySoft,
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  otp: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    textAlign: "center",
    color: ink,
    backgroundColor: "#fff",
    fontSize: 18,
    fontFamily: "InterBold",
    padding: 0,
  },
  error: {
    color: "#b42336",
    backgroundColor: "#fff2f4",
    padding: 12,
    borderRadius: 6,
    fontFamily: "Inter",
    fontSize: 13,
    lineHeight: 20,
  },
  notice: {
    color: theme.link,
    backgroundColor: theme.primarySoft,
    padding: 12,
    borderRadius: 6,
    fontFamily: "Inter",
    fontSize: 13,
    lineHeight: 20,
  },
});
