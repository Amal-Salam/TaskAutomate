/* eslint-disable prettier/prettier */
import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

type Theme = "light" | "dark" | "system";

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.remove("light", "dark");
  if (theme === "system") {
    root.classList.add(systemDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeStored] = useLocalStorage<Theme>("theme", "system");
  
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {if (theme === "system") applyTheme("system");};
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
   }, [theme]);
   
  const setTheme = (t: Theme) => {
    setThemeStored(t);
    applyTheme(t);
   };
  return (<ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
)};
export const useTheme = () => useContext(ThemeCtx);