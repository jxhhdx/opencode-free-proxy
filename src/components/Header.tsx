import type { AppStatus } from "../types";

export default function Header({
  status, loading, onRefresh,
}: {
  status: AppStatus | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const dotStyle = {
    width: 8, height: 8, borderRadius: "50%",
    background: loading ? "#fb923c" : status?.running ? "#4ade80" : "#f87171",
    boxShadow: status?.running ? "0 0 8px rgba(74,222,128,0.3)" : "none",
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "var(--accent)" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="currentColor" opacity="0.15" />
            <path d="M8 14l4-4 4 4-4 4-4-4z" fill="currentColor" opacity="0.6" />
            <path d="M20 14l-4 4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>OpenCode Free Proxy</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            <span style={dotStyle} />
            <span>{loading ? "Loading..." : status?.running ? `Running on port ${status.port}` : "Stopped"}</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span onClick={() => copy("http://localhost:6446")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 4, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11 }}>
              <code style={{ color: "var(--accent)" }}>http://localhost:6446</code>
            </span>
          </div>
        </div>
      </div>
      <button onClick={onRefresh}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 8a6 6 0 0111.2-3M14 8a6 6 0 01-11.2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Refresh
      </button>
    </div>
  );
}

async function copy(t: string) {
  try { await navigator.clipboard.writeText(t); } catch { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
}
