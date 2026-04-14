/* eslint-disable prettier/prettier */
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./Components/Layout2.js";
import Dashboard from "./Pages/Dashboard.js";
import PredictiveTimeline from "./Pages/Timeline.js";
import AcceptInvite from "./Pages/AcceptInvite.js";
import WorkspaceSettings from "./Pages/WorkspaceSettings.js";
import Projects from "./Pages/Projects.js";
import TaskQueue from "./Pages/TaskQueue.js";
import WorkloadPage from "./Pages/Workload.js";
import RetrospectivePage from "./Pages/Retrospective.js";
import CommandBar from "./Components/CommandBar.js";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useWorkspace } from "./Lib/WorkspaceContext.js";

// ── Inner app — has access to workspace context ───────────────────────────────
function InnerApp() {
  const { activeWorkspace } = useWorkspace();
  const [showCommandBar, setShowCommandBar] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandBar((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <Layout>
        {(workspaceId) => (
          <Routes>
            <Route path="/"              element={<Dashboard        workspaceId={workspaceId} />} />
            <Route path="/projects"      element={<Projects />} />
            <Route path="/kanban-board"  element={<TaskQueue        workspaceId={workspaceId} />} />
            <Route path="/timeline"      element={<PredictiveTimeline workspaceId={workspaceId} />} />
            <Route path="/workload"      element={<WorkloadPage     workspaceId={workspaceId} />} />
            <Route path="/retrospective" element={<RetrospectivePage workspaceId={workspaceId} />} />
            <Route path="/settings"      element={<WorkspaceSettings />} />
          </Routes>
        )}
      </Layout>

      {/* Global Cmd+K command bar */}
      {showCommandBar && activeWorkspace && (
        <CommandBar
          workspaceId={activeWorkspace._id}
          onClose={() => setShowCommandBar(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Invite route — outside Layout, no auth required */}
      <Route path="/invite/:token" element={<AcceptInvite />} />

      <Route path="/*" element={
        <>
          <SignedIn>
            <InnerApp />
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </>
      } />
    </Routes>
  );
}