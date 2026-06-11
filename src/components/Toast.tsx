export default function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "10px 20px", borderRadius: 6, fontSize: 13, color: "var(--text)", zIndex: 50 }}>
      {message}
    </div>
  );
}
