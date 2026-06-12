import { useState, useEffect } from "react";
import { useI18n } from "../i18n/context";
import { useTheme } from "../i18n/theme";
import { invoke } from "@tauri-apps/api/core";

async function getLogs() {
  try { return await invoke("get_logs"); } catch { return []; }
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    getLogs().then(setLogs);
    const iv = setInterval(() => getLogs().then(setLogs), 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 420, maxHeight: "80vh", margin: "0 16px", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)" }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            {t.settings.title}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Language */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)" }}><circle cx="12" cy="12" r="4"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {t.settings.lang}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["en", "zh"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid", cursor: "pointer", background: lang === l ? "var(--accent)" : "var(--surface2)", color: lang === l ? "white" : "var(--text)", borderColor: lang === l ? "var(--accent)" : "var(--border)" }}>
                {l === "en" ? t.settings.en : t.settings.zh}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)" }}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            {t.settings.theme}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["dark", "light", "system"] as const).map((th) => (
              <button key={th} onClick={() => setTheme(th)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, border: "1px solid", cursor: "pointer", background: theme === th ? "var(--accent)" : "var(--surface2)", color: theme === th ? "white" : "var(--text)", borderColor: theme === th ? "var(--accent)" : "var(--border)" }}>
                {th === "dark" ? t.settings.dark : th === "light" ? t.settings.light : t.settings.system}
              </button>
            ))}
          </div>
        </div>

        {/* Logs */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted)" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Logs
            <span style={{ fontSize: 11, color: "var(--muted)" }}>({logs.length})</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", fontSize: 11, fontFamily: '"SF Mono", monospace', maxHeight: 200, borderRadius: 6, background: "var(--surface2)", padding: "6px 8px" }}>
            {logs.length === 0 ? (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: 12 }}>No logs yet</div>
            ) : (
              [...logs].reverse().map((log: any, i: number) => (
                <div key={i} style={{ padding: "2px 0", display: "flex", gap: 6, color: log.level === "ERROR" ? "#f87171" : log.level === "WARN" ? "#fb923c" : "var(--muted)" }}>
                  <span style={{ flexShrink: 0, color: "var(--muted)", opacity: 0.6 }}>{log.time}</span>
                  <span style={{ flexShrink: 0, fontWeight: 600, width: 36 }}>{log.level}</span>
                  <span style={{ wordBreak: "break-all" }}>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
