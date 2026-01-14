/* eslint-disable prettier/prettier */
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
  return (
    <aside
      className={twMerge(
        "fixed left-0 top-0 h-full bg-indigo text-white flex flex-col transition-all duration-300 z-40",
        open ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-4">
        <div className={twMerge("font-bold text-lg", !open && "hidden")}>PM-AI</div>
        <button onClick={() => setOpen((o) => !o)} className="p-2 rounded hover:bg-indigo-600">
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-indigo-600 transition"
          >
            <item.icon size={20} />
            <span className={twMerge("", !open && "hidden")}>{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}