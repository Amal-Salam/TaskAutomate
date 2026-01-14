import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { FiMenu, FiX, FiHome, FiTrendingUp, FiSettings } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";
import { twMerge } from "tailwind-merge";
const navItems = [
    { label: "Dashboard", icon: FiHome, href: "/" },
    { label: "Predictive Timeline", icon: FiTrendingUp, href: "/timeline" },
    { label: "AI Settings", icon: BsRobot, href: "/ai-settings" },
    { label: "Preferences", icon: FiSettings, href: "/settings" },
];
export default function NavSidebar() {
    const [open, setOpen] = useState(true);
    return (_jsxs("aside", { className: twMerge("fixed left-0 top-0 h-full bg-indigo text-white flex flex-col transition-all duration-300 z-40", open ? "w-64" : "w-16"), children: [_jsxs("div", { className: "flex items-center justify-between p-4", children: [_jsx("div", { className: twMerge("font-bold text-lg", !open && "hidden"), children: "PM-AI" }), _jsx("button", { onClick: () => setOpen((o) => !o), className: "p-2 rounded hover:bg-indigo-600", children: open ? _jsx(FiX, { size: 20 }) : _jsx(FiMenu, { size: 20 }) })] }), _jsx("nav", { className: "flex-1 px-2 space-y-2", children: navItems.map((item) => (_jsxs("a", { href: item.href, className: "flex items-center space-x-3 px-3 py-2 rounded hover:bg-indigo-600 transition", children: [_jsx(item.icon, { size: 20 }), _jsx("span", { className: twMerge("", !open && "hidden"), children: item.label })] }, item.href))) })] }));
}
//# sourceMappingURL=NavSideBar.js.map