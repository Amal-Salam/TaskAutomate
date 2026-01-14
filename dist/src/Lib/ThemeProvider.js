import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
const ThemeCtx = createContext({
    theme: "system",
    setTheme: () => { },
});
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage("theme", "system");
    useEffect(() => {
        const root = window.document.documentElement;
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.remove("light", "dark");
        if (theme === "system")
            root.classList.add(systemDark ? "dark" : "light");
        else
            root.classList.add(theme);
    }, [theme]);
    return _jsx(ThemeCtx.Provider, { value: { theme, setTheme }, children: children });
};
export const useTheme = () => useContext(ThemeCtx);
//# sourceMappingURL=ThemeProvider.js.map