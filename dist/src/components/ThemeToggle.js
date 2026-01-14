import { jsx as _jsx } from "react/jsx-runtime";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../lib/ThemeProvider.js";
export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return (_jsx("button", { onClick: () => setTheme(isDark ? "light" : "dark"), className: "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700", "aria-label": "Toggle theme", children: isDark ? _jsx(FiSun, { size: 18 }) : _jsx(FiMoon, { size: 18 }) }));
}
//# sourceMappingURL=ThemeToggle.js.map