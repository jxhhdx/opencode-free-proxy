import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light" | "system";

const lightVars = {
  "--bg": "#f5f5f7",
  "--surface": "#ffffff",
  "--surface2": "#f0f0f2",
  "--border": "#d2d2d7",
  "--text": "#1d1d1f",
  "--muted": "#86868b",
  "--accent": "#6c8cff",
};

const darkVars = {
  "--bg": "#0f1117",
  "--surface": "#181a22",
  "--surface2": "#1e2030",
  "--border": "#2a2d3e",
  "--text": "#e1e3eb",
  "--muted": "#8b8fa3",
  "--accent": "#6c8cff",
};

const ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "dark", setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const isDark = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : theme === "dark";
    const vars = isDark ? darkVars : lightVars;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const vars = mq.matches ? darkVars : lightVars;
      const root = document.documentElement;
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return <ctx.Provider value={{ theme, setTheme }}>{children}</ctx.Provider>;
}

export function useTheme() {
  return useContext(ctx);
}
