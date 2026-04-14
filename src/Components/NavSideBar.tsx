/* eslint-disable prettier/prettier */
import { useState } from "react";
import { FiX, FiHome, FiTrendingUp, FiSettings,  FiChevronDown, FiCheck,FiUserPlus, FiUsers, FiRotateCcw } from "react-icons/fi";
import { MdOutlineAssignment, MdOutlineGroupAdd } from "react-icons/md";
import { BiAddToQueue } from "react-icons/bi";
import { twMerge } from "tailwind-merge";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useWorkspace } from "../Lib/WorkspaceContext.js";
import { useNavigate, useLocation } from "react-router-dom";
import InviteModal from "./InviteModal.js";


const navItems = [
  { label: "Dashboard", icon: FiHome, href: "/" },
  { label: "Projects", icon:MdOutlineAssignment, href: "/projects"},
  { label: "Task Queue", icon: BiAddToQueue, href: "/Kanban-board" },
  { label: "Predictive Timeline", icon: FiTrendingUp, href: "/timeline" },
  { label: "Workload",           icon: FiUsers,             href: "/workload" },
  { label: "Retrospective",      icon: FiRotateCcw,         href: "/retrospective" },
  { label: "Team Activities", icon: MdOutlineGroupAdd, href: "/ai-settings" },
  { label: "Settings", icon: FiSettings, href: "/settings" },
];

interface Props {
  open: boolean;           // mobile drawer open
  collapsed: boolean;      // desktop collapsed state
  onClose: () => void;
  onCollapse: () => void;
}

export default function NavSidebar({open, collapsed, onClose}: Props) {

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const createWorkspace = useMutation(api.workspaces.create);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    try {
      const id = await createWorkspace({ name: newWsName.trim() });
      setActiveWorkspaceId(id as string);
      setNewWsName("");
      setShowCreateWs(false);
      setWsDropdownOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleNav = (href: string) => {
    navigate(href);
    onClose(); // close mobile drawer on navigation
  };

  return (
    <>
    <aside
      className={twMerge(
       // Base styles
          "fixed top-0 left-0 h-[calc(100vh-3.5rem)] bg-slate-950 dark:bg-app-indigo text-white flex flex-col z-40 transition-all duration-300",
          // Desktop: always visible, width depends on collapsed state
          "hidden lg:flex",
          collapsed ? "lg:w-16" : "lg:w-64",
          // Mobile: full-width drawer that slides in/out
          open && "flex w-72 shadow-2xl"
        )}
    >
      {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm">Menu</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition">
            <FiX size={18} />
          </button>
        </div>

      {/* Workspace Switcher */}
      {/* Workspace Switcher — hidden when collapsed on desktop */}
        <div className={twMerge("relative px-3 pt-3 pb-1", collapsed && "lg:hidden")}>
          <button
            onClick={() => setWsDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-white/30 flex items-center justify-center text-xs font-bold shrink-0">
                {activeWorkspace?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="truncate font-medium">
                {activeWorkspace?.name ?? "Select workspace"}
              </span>
            </div>
            <FiChevronDown
              size={14}
              className={twMerge("shrink-0 transition-transform", wsDropdownOpen && "rotate-180")}
            />
          </button>
 
          {/* Collapsed state — show just the workspace initial */}
          {collapsed && (
            <div className="hidden lg:flex justify-center py-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
                {activeWorkspace?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            </div>
          )}
 
          {wsDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 dark:border-gray-700">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => { setActiveWorkspaceId(ws._id); setWsDropdownOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-iris/20 flex items-center justify-center text-xs font-bold text-iris">
                      {ws.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{ws.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{ws.role}</p>
                    </div>
                  </div>
                  {ws._id === activeWorkspace?._id && (
                    <FiCheck size={14} className="text-iris shrink-0" />
                  )}
                </button>
              ))}
 
              <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                {showCreateWs ? (
                  <div className="flex gap-2 p-1">
                    <input
                      autoFocus
                      type="text"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateWorkspace(); if (e.key === "Escape") setShowCreateWs(false); }}
                      placeholder="Workspace name"
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/40"
                    />
                    <button
                      onClick={handleCreateWorkspace}
                      disabled={creating || !newWsName.trim()}
                      className="px-3 py-1.5 bg-iris text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-iris/80 transition"
                    >
                      {creating ? "..." : "Add"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateWs(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-iris hover:bg-iris/5 rounded-lg transition"
                  >
                    {/* <FiPlus size={14} />
                    New workspace */}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
      {/* Cmd+K hint — hidden when collapsed */}
        {/* {!collapsed && (
          <div className="px-3 pb-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] text-white/40 flex-1">Quick create task…</span>
              <kbd className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/10 text-white/50">⌘K</kbd>
            </div>
          </div>
        )} */}

      {/* Nav items */}
      <nav className="flex-1 px-2 pt-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              title = {collapsed ? item.label : undefined}
              className={twMerge(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ",
                collapsed ? "lg:justify-center lg:pc-0" : "",
                active
                  ? "bg-white/20 font-semibold"
                  : "hover:bg-white/10 text-white/80"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              <span className={twMerge("transition-all", collapsed && "lg:hidden")}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Invite Button */}
      <div className={twMerge("px-3 pb-3", collapsed && "lg:px-2")}>
        {activeWorkspace &&(
          <button
              onClick={() => setShowInvite(true)}
              title={collapsed ? "Invite teammates" : undefined}
              className={twMerge(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 transition text-sm text-white/90",
                collapsed && "lg:justify-center lg:px-0"
              )}
            >
              <FiUserPlus size={16} className="shrink-0" />
              <span className={twMerge(collapsed && "lg:hidden")}>Invite teammates</span>
            </button>
        )}

      </div>
     

      {/* Role badge at bottom */}

      {!collapsed && activeWorkspace?.role && (
        
          <div className="mt-2 px-3 py-2 rounded-lg bg-white/5 text-xs text-white/50 capitalize">
            {activeWorkspace.role} · {activeWorkspace.name}
          </div>
        
      )}
    </aside>

    {/* Invite modal rendered outside aside to avoid z-index issues */}
      {showInvite && activeWorkspace && (
        <InviteModal
          workspaceId={activeWorkspace._id}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
    
    
  );
}