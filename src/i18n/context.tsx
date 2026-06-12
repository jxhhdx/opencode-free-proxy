import { createContext, useContext, useState, type ReactNode } from "react";
import { en, zh, type Translations } from "./translations";

type Lang = "en" | "zh";

const ctx = createContext<{ t: Translations; lang: Lang; setLang: (l: Lang) => void }>({
  t: en, lang: "en", setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = lang === "zh" ? zh : en;
  return <ctx.Provider value={{ t, lang, setLang }}>{children}</ctx.Provider>;
}

export function useI18n() {
  return useContext(ctx);
}
