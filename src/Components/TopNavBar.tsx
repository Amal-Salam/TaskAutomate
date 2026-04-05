/* eslint-disable prettier/prettier */
import { FiMenu, FiSun, FiMoon, FiMonitor, FiChevronLeft,  } from "react-icons/fi";
import { useTheme } from "../Lib/ThemeProvider.js";
import { UserButton } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";

interface Props {
  onMenuClick: () => void;
  onCollapseClick: () => void;
  sidebarCollapsed: boolean;
}

export default function TopNav({ onMenuClick, onCollapseClick, sidebarCollapsed }: Props) {
  const { theme, setTheme } = useTheme();


  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const ThemeIcon = theme === "light" ? FiSun : theme === "dark" ? FiMoon : FiMonitor;

  return (
    <header className="h-14 w-full bg-white dark:bg-slate-950  dark:border-gray-800 flex items-center px-4 gap-3 z-20 sticky top-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="Open menu"
      >
        <FiMenu size={20} />
      </button>

      {/* Desktop sidebar collapse toggle */}
      <button
        onClick={onCollapseClick}
        className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? <FiMenu size={24} /> : <FiChevronLeft size={18} />}
      </button>

      {/* App title */}
      <div className="flex items-center gap-2 flex-1">
        <span className="font-bold font-serif italic text-3xl text-indigo dark:text-shimmer-gold tracking-tight">
          ForeSight
        </span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Current: ${theme} — click for ${nextTheme}`}
        >
          <ThemeIcon size={18} />
        </button>

        {/* User avatar */}
        {/* {user && (
          <div className="w-8 h-8 rounded-full bg-iris/20 flex items-center justify-center text-xs font-bold text-iris overflow-hidden">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={user.fullName ?? "User"} className="w-full h-full object-cover" />
            ) : (
              (user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "U")[0].toUpperCase()
            )}
          </div>
        )} */}
        <UserButton
        appearance={{
         baseTheme:dark
        }}/>
      </div>
    </header>
  );
}