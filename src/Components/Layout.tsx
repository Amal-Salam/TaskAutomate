/* eslint-disable prettier/prettier */
import NavSidebar from "./NavSideBar.js";
import TopNav from "./TopNavBar.js";
import AIIntelligenceBar from "./AIBar.js";
import { useWorkspace } from "../Lib/Workspacecontext.js";
import { BsRobot } from "react-icons/bs";
import { FiPlus } from "react-icons/fi";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useState } from "react";

interface LayoutProps {
  children: (workspaceId: string) => React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { activeWorkspace, loading, workspaces, setActiveWorkspaceId, userReady } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);
  const createWorkspace = useMutation(api.workspaces.create);

  const handleCreate = async () => {
    if (!newWsName.trim() || !userReady) return;
    setCreating(true);
    try {
      const id = await createWorkspace({ name: newWsName.trim() });
      setActiveWorkspaceId(id as string);
      setNewWsName("");
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-offwhite dark:bg-slate-950">
        <TopNav
        onMenuClick={() => setSidebarOpen(true)}
        onCollapseClick={() => setSidebarCollapsed((c) => !c)}
        sidebarCollapsed={sidebarCollapsed}
      />
 
    
     <div className="flex flex-1 overflow-hidden">
      <NavSidebar
      open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onCollapse={() => setSidebarCollapsed((c) => !c)}
       />

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

      

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300
            ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}>
        {/* Only show AIBar when a workspace is active */}
        {activeWorkspace && (
          <AIIntelligenceBar workspaceId={activeWorkspace._id} />
        )}

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {loading ? (
            // Loading state
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <BsRobot size={32} className="animate-pulse text-iris" />
                <p className="text-sm">Generating your workspace...</p>
              </div>
            </div>
          ) : workspaces.length === 0 ? (
            // Empty state — no workspaces yet
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-sm w-full px-4">
                <BsRobot size={48} className="text-iris mx-auto mb-4 opacity-60" />
                <h2 className="text-xl font-bold text-indigo dark:text-glossy-gold mb-2">
                  Welcome to TaskAutomate
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Create your first workspace to get started. You can invite your
                  team and let AI manage your deadlines.
                </p>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                    placeholder="e.g.Project Name"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-iris/40 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newWsName.trim() || !userReady}
                    className="flex items-center gap-2 px-4 py-2 bg-iris text-white rounded-lg text-sm font-semibold hover:bg-iris/80 disabled:opacity-50 transition"
                  >
                    <FiPlus size={14} />
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          ): !activeWorkspace ? (
             <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <BsRobot size={32} className="animate-pulse text-iris" />
                <p className="text-sm">Loading workspace...</p>
              </div>
            </div>
          
          ) : (

            // Normal view — pass workspaceId to page content
            children(activeWorkspace._id)
          )}
        </main>
        </div>
      </div>
    </div>
  );
}