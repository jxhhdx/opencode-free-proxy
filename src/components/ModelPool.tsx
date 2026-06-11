import { useState, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ModelPoolEntry } from "../types";
import { reorderPool, togglePoolEntry, removePoolEntry, runSpeedTest, importToTool, getStatus } from "../hooks/useTauri";

const S = {
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16 } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", marginBottom: 6 } as React.CSSProperties,
  btn: (bg: string, c: string) => ({ padding: "4px 8px", borderRadius: 4, fontSize: 11, background: bg, color: c, cursor: "pointer", border: "none" } as React.CSSProperties),
  impBtn: { padding: "6px 10px", borderRadius: 4, fontSize: 11, background: "var(--accent)", color: "white", cursor: "pointer", border: "none" } as React.CSSProperties,
  input: { width: "100%", padding: "8px 12px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text)", outline: "none" } as React.CSSProperties,
};

function SortableRow({ entry, result, onToggle, onRemove, onImport }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const [showImp, setShowImp] = useState(false);
  const style = { ...S.row, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : entry.enabled ? 1 : 0.5 };
  const isOpen = entry.provider_type === "opencode";

  return (
    <div ref={setNodeRef} style={style}>
      <span {...attributes} {...listeners} style={{ color: "var(--muted)", cursor: "grab", fontSize: 14, marginRight: 8, userSelect: "none" }}>⠿</span>
      <button onClick={() => onToggle(entry.id)} style={{ flexShrink: 0, width: 28, height: 16, borderRadius: "9999px", position: "relative", border: "none", cursor: "pointer", background: entry.enabled ? "var(--accent)" : "var(--border)" }}>
        <div style={{ position: "absolute", top: 2, width: 12, height: 12, borderRadius: "50%", background: "white", left: entry.enabled ? 14 : 2 }} />
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1, marginLeft: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{entry.name}</span>
          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: isOpen ? "var(--accent)" : "#fb923c", color: "white" }}>{isOpen ? "Free" : "Custom"}</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>#{entry.priority}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--muted)" }}>
          {result ? result.success ? (
            <>
              <span>Latency: <strong style={{ color: "var(--text)" }}>{result.latency_ms}ms</strong></span>
              <span>Speed: <strong style={{ color: "var(--text)" }}>{result.tokens_per_sec.toFixed(1)}</strong> tok/s</span>
            </>
          ) : <span style={{ color: "#f87171" }}>Failed: {result.error}</span> : <span>No data</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowImp(!showImp)} style={S.btn("#2a2d3e", "white")}>Import</button>
          {showImp && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setShowImp(false)} />
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 20, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 0", minWidth: 120 }}>
                {["claude", "codex", "ccswitch"].map(t => (
                  <button key={t} onClick={() => { setShowImp(false); onImport(entry.name, t); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 12px", fontSize: 11, color: "var(--text)", cursor: "pointer", background: "none", border: "none" }}>
                    {t === "claude" ? "Claude" : t === "codex" ? "Codex" : "CCSwitch"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {!isOpen && <button onClick={() => onRemove(entry.id)} style={S.btn("rgba(248,113,113,0.1)", "#f87171")}>X</button>}
      </div>
    </div>
  );
}

export default function ModelPool({ entries, results, setResults, onRefresh, showToast, onAddClick }: any) {
  const [testing, setTesting] = useState(false);
  const [showPoolImp, setShowPoolImp] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = entries.slice().sort((a: any, b: any) => a.priority - b.priority).map((e: any) => e.id);
    const oi = ids.indexOf(active.id), ni = ids.indexOf(over.id);
    if (oi < 0 || ni < 0) return;
    ids.splice(ni, 0, ids.splice(oi, 1)[0]);
    try { await reorderPool(ids); onRefresh(); } catch (e: any) { showToast("Error: " + e); }
  }, [entries, onRefresh, showToast]);

  const handleToggle = useCallback(async (id: string) => { try { await togglePoolEntry(id); onRefresh(); } catch (e: any) { showToast("Error: " + e); } }, [onRefresh, showToast]);
  const handleRemove = useCallback(async (id: string) => { try { await removePoolEntry(id); onRefresh(); } catch (e: any) { showToast("Error: " + e); } }, [onRefresh, showToast]);

  const handleBatchTest = useCallback(async () => {
    setTesting(true); setResults({});
    for (const e of entries.slice().sort((a: any, b: any) => a.priority - b.priority)) {
      try { const r = await runSpeedTest(e.name); setResults((p: any) => ({ ...p, [e.name]: r })); } catch {}
    }
    setTesting(false); showToast("Batch test complete");
  }, [entries, setResults, showToast]);

  const handleImport = useCallback(async (name: string, tool: string) => {
    try {
      const status: any = await getStatus();
      const key = status.keys[0]?.key;
      if (!key) { showToast("No API key"); return; }
      showToast(await importToTool({ model: name, model_name: name, api_key: key, tool }));
    } catch (e: any) { showToast("Error: " + e); }
  }, [showToast]);

  const handlePoolImport = useCallback(async (tool: string) => {
    try {
      const status: any = await getStatus();
      const key = status.keys[0]?.key;
      if (!key) { showToast("No API key"); return; }
      showToast(await importToTool({ model: "ModelPool", model_name: "", api_key: key, tool }));
      setShowPoolImp(false);
    } catch (e: any) { showToast("Error: " + e); }
  }, [showToast]);

  const sorted = entries.slice().sort((a: any, b: any) => a.priority - b.priority);

  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>Model Pool</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onAddClick} style={{ ...S.btn("var(--surface2)", "var(--text)"), border: "1px solid var(--border)" }}>+ Add</button>
          <button onClick={handleBatchTest} disabled={testing} style={{ ...S.impBtn, opacity: testing ? 0.4 : 1 }}>{testing ? "Testing..." : "Speed Test"}</button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowPoolImp(!showPoolImp)} style={S.btn("#2a2d3e", "white")}>Import Pool</button>
            {showPoolImp && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setShowPoolImp(false)} />
                <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 20, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 0", minWidth: 120 }}>
                  {["claude", "codex", "ccswitch"].map(t => (
                    <button key={t} onClick={() => handlePoolImport(t)} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 12px", fontSize: 11, color: "var(--text)", cursor: "pointer", background: "none", border: "none" }}>
                      {t === "claude" ? "Claude" : t === "codex" ? "Codex" : "CCSwitch"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--muted)" }}>{entries.length}</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 13 }}>No models. Click + Add</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((e: any) => e.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {sorted.map((e: any) => (
                <SortableRow key={e.id} entry={e} result={results[e.name]} onToggle={handleToggle} onRemove={handleRemove} onImport={handleImport} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
