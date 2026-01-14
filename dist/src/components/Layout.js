import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import NavSidebar from "./NavSideBar.js";
import AIIntelligenceBar from "./AIBar.js";
export default function Layout({ children }) {
    return (_jsxs("div", { className: "min-h-screen flex", children: [_jsx(NavSidebar, {}), _jsxs("div", { className: "flex-1 flex flex-col ml-16 sm:ml-64", children: [_jsx(AIIntelligenceBar, {}), _jsx("main", { className: "flex-1 p-4 sm:p-6 bg-offwhite dark:bg-gray-900", children: children })] })] }));
}
//# sourceMappingURL=Layout.js.map