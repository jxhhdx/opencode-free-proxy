import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { en, zh, type Translations } from "./translations";

type Lang = "en" | "zh";

const ctx = createContext<{ t: Translations; lang: Lang; setLang: (l: Lang) => void }>({
  t: zh, lang: "zh", setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("lang");
    return (saved as Lang) || "zh";
  });

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);
  const t = lang === "zh" ? zh : en;
  return <ctx.Provider value={{ t, lang, setLang }}>{children}</ctx.Provider>;
}

export function useI18n() {
  return useContext(ctx);
}
