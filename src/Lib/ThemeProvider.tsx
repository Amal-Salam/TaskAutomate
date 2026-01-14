/* eslint-disable prettier/prettier */
import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

type Theme = "light" | "dark" | "system";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "system");
  useEffect(() => {
    const root = window.document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.remove("light", "dark");
    if (theme === "system") root.classList.add(systemDark ? "dark" : "light");
    else root.classList.add(theme);
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
};
export const useTheme = () => useContext(ThemeCtx);