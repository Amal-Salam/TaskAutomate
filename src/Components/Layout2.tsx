/* eslint-disable prettier/prettier */
// Styles live in index.css — import it once in your app entry (e.g. main.tsx)
import NavSidebar from "./NavSideBar.js";
import TopNav from "./TopNavBar.js";
import AIIntelligenceBar from "./AIBar.js";
import { useWorkspace } from "../Lib/WorkspaceContext.js";
import { FiPlus } from "react-icons/fi";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useState } from "react";

interface LayoutProps {
  children: (workspaceId: string) => React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { activeWorkspace, loading, workspaces, setActiveWorkspaceId, userReady } = useWorkspace();
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newWsName, setNewWsName]               = useState("");
  const [creating, setCreating]                 = useState(false);
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
    <div className="cadence-root">
      <div className="cadence-inner">

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <NavSidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onCollapse={() => setSidebarCollapsed((c) => !c)}
        />

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="mobile-backdrop lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className={`cadence-main-col ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}>

          {/* Top nav */}
          <TopNav
            onMenuClick={() => setSidebarOpen(true)}
            onCollapseClick={() => setSidebarCollapsed((c) => !c)}
            sidebarCollapsed={sidebarCollapsed}
          />

          {/* AI bar — only when workspace is active */}
          {activeWorkspace && (
            <div className="cadence-ai-bar">
              <AIIntelligenceBar workspaceId={activeWorkspace._id} />
            </div>
          )}

          {/* ── Page content ─────────────────────────────────────────── */}
          <main className="cadence-page">

            {loading ? (
              /* Loading */
              <div className="cadence-loader">
                <div className="cadence-loader__inner">
                  <div className="cadence-loader__dots">
                    <span className="pulse-dot" />
                    <span className="pulse-dot" />
                    <span className="pulse-dot" />
                  </div>
                  <p className="cadence-loader__label">Generating workspace…</p>
                </div>
              </div>

            ) : workspaces.length === 0 ? (
              /* Empty state — no workspaces */
              <div className="cadence-empty">
                <div className="glass-card cadence-empty__card">
                  <div className="cadence-empty__glow" />

                  <div className="cadence-empty__icon-wrap">
                    <span className="material-symbols-outlined cadence-empty__icon">
                      auto_awesome
                    </span>
                  </div>

                  <h2 className="cadence-empty__title">Welcome to <p className=" 2xl font-bold font-serif italic text-shimmer-gold">ForeSight</p></h2>

                  <p className="cadence-empty__desc">
                    Create your first workspace to get started. Invite your team
                    and let AI manage your deadlines intelligently.
                  </p>

                  <div className="cadence-empty__divider" />

                  <span className="cadence-empty__field-label">
                    Name your workspace
                  </span>

                  <div className="cadence-empty__row">
                    <input
                      autoFocus
                      type="text"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                      placeholder="e.g. Project Phoenix"
                      className="ws-input"
                    />
                    <button
                      onClick={handleCreate}
                      disabled={creating || !newWsName.trim() || !userReady}
                      className="ws-btn"
                    >
                      <FiPlus size={14} />
                      {creating ? "Creating…" : "Create"}
                    </button>
                  </div>
                </div>
              </div>

            ) : !activeWorkspace ? (
              /* Workspace switching loader */
              <div className="cadence-loader">
                <div className="cadence-loader__inner">
                  <div className="cadence-loader__dots">
                    <span className="pulse-dot" />
                    <span className="pulse-dot" />
                    <span className="pulse-dot" />
                  </div>
                  <p className="cadence-loader__label">Loading workspace…</p>
                </div>
              </div>

            ) : (
              /* Normal view */
              children(activeWorkspace._id)
            )}

          </main>
        </div>
      </div>
    </div>
  );
}