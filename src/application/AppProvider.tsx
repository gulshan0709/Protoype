import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Platform, Share, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext, light, dark } from "../shared/theme/Theme";
import { defaultWorkspace, validWorkspace } from "../domain/contracts/registry";
import { csvFor } from "../domain/contracts/logic";
import type {
  AuditEvent,
  DataRecord,
  PageContract,
  Workspace,
} from "../domain/contracts/types";
type Theme = "light" | "dark" | "system";
interface Saved {
  workspace: Workspace;
  theme: Theme;
  session: boolean;
  rememberSession: boolean;
  name: string;
  audit: AuditEvent[];
  readNotifications: string[];
  columnPreferences: Record<string, string[]>;
}
const initial: Saved = {
  workspace: defaultWorkspace,
  theme: "light",
  session: false,
  rememberSession: true,
  name: "Alex Morgan",
  audit: [],
  readNotifications: [],
  columnPreferences: {},
};
const key = "vizenta-ai-demo-v1";
interface AppContext extends Saved {
  ready: boolean;
  toast: string;
  update: (patch: Partial<Saved>) => void;
  setColumnPreference: (key: string, ids: string[]) => void;
  notify: (text: string) => void;
  addAudit: (
    event: Omit<AuditEvent, "id" | "at" | "actor" | "workspace">,
  ) => void;
  exportRows: (page: PageContract, rows: DataRecord[]) => Promise<void>;
}
const Context = createContext<AppContext>(null!);
export const useApp = () => useContext(Context);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState(initial);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const system = useColorScheme();
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw && mounted) {
          const parsed = JSON.parse(raw);
          setSaved({
            ...initial,
            ...parsed,
            // Always start at login, including previously remembered sessions.
            session: false,
            workspace: validWorkspace(parsed.workspace),
            audit: Array.isArray(parsed.audit) ? parsed.audit : [],
            columnPreferences:
              parsed.columnPreferences &&
              typeof parsed.columnPreferences === "object" &&
              !Array.isArray(parsed.columnPreferences)
                ? parsed.columnPreferences
                : {},
          });
        }
      })
      .catch(() =>
        setToast(
          "Saved preferences could not be loaded. Using the default workspace.",
        ),
      )
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(
        key,
        JSON.stringify({
          ...saved,
          session: false,
        }),
      ).catch(() =>
        setToast(
          "Changes are available this session, but could not be saved on this device.",
        ),
      );
  }, [saved, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const update = useCallback(
    (patch: Partial<Saved>) => setSaved((s) => ({ ...s, ...patch })),
    [],
  );
  const setColumnPreference = useCallback((key: string, ids: string[]) => {
    setSaved((s) => ({
      ...s,
      columnPreferences: { ...s.columnPreferences, [key]: ids },
    }));
  }, []);
  const addAudit = useCallback(
    (event: Omit<AuditEvent, "id" | "at" | "actor" | "workspace">) => {
      setSaved((s) => ({
        ...s,
        audit: [
          {
            ...event,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            at: new Date().toISOString(),
            actor: s.name,
            workspace: s.workspace,
          },
          ...s.audit,
        ].slice(0, 500),
      }));
    },
    [],
  );
  const exportRows = useCallback(
    async (page: PageContract, rows: DataRecord[]) => {
      try {
        const csv = csvFor(page, rows);
        if (Platform.OS === "web") {
          const url = URL.createObjectURL(
            new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
          );
          const link = document.createElement("a");
          link.href = url;
          link.download = `vizenta-${page.id}.csv`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          await Share.share({
            title: `Vizenta · ${page.heading}`,
            message: csv,
          });
        }
        setToast(`Exported ${rows.length} records from your current view.`);
      } catch {
        setToast("Export could not be completed. Please try again.");
      }
    },
    [],
  );
  const value = useMemo(
    () => ({
      ...saved,
      ready,
      toast,
      update,
      setColumnPreference,
      notify: setToast,
      addAudit,
      exportRows,
    }),
    [saved, ready, toast, update, setColumnPreference, addAudit, exportRows],
  );
  const resolved = saved.theme === "system" ? system : saved.theme;
  return (
    <Context.Provider value={value}>
      <ThemeContext.Provider value={resolved === "dark" ? dark : light}>
        {children}
      </ThemeContext.Provider>
    </Context.Provider>
  );
}
