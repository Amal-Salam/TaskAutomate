/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useWorkspace } from "../Lib/WorkspaceContext.js";
import { useNavigate } from "react-router-dom";
import {
  FiPlus, FiSettings, FiUsers, FiCheck, FiChevronRight,
  FiTrash2, FiEdit2, FiX, FiUserPlus,
} from "react-icons/fi";
import { BsRobot } from "react-icons/bs";
import InviteModal from "../Components/InviteModal.js";

export default function Projects() {
  const navigate = useNavigate();
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();

  const [showCreate, setShowCreate] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const createWorkspace  = useMutation(api.workspaces.create);
  const renameWorkspace  = useMutation(api.workspaces.rename);
  const deleteWorkspace  = useMutation(api.workspaces.deleteWorkspace);

  // Get task counts and member counts per workspace
  const activeTasks = useQuery(
    api.tasks.list,
    activeWorkspace ? { workspaceId: activeWorkspace._id as any } : "skip"
  );
  const activeMembers = useQuery(
    api.workspaces.listMembers,
    activeWorkspace ? { workspaceId: activeWorkspace._id as any } : "skip"
  );
  const myUserId = useQuery(api.tasks.getMyUserId);

  const handleCreate = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const id = await createWorkspace({ name: newWsName.trim() });
      setActiveWorkspaceId(id as string);
      setNewWsName("");
      setShowCreate(false);
    } catch (e: any) {
      setCreateError(e.message ?? "Failed to create workspace.");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (wsId: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameWorkspace({ workspaceId: wsId as any, name: renameValue.trim() });
      setRenamingId(null);
      setRenameValue("");
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDelete = async (wsId: string) => {
    setDeleting(true);
    try {
      await deleteWorkspace({ workspaceId: wsId as any });
      const remaining = workspaces.filter(w => w._id !== wsId);
      if (remaining.length > 0) setActiveWorkspaceId(remaining[0]._id);
      setConfirmDeleteId(null);
    } catch (e: any) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const activeDone  = (activeTasks ?? []).filter(t => t.status === "done").length;
  const activeTotal = (activeTasks ?? []).length;
  const activePct   = activeTotal > 0 ? Math.round((activeDone / activeTotal) * 100) : 0;
  const myRole = (activeMembers ?? []).find(m => m.userId === myUserId?.toString())?.role;
  const isAdmin = myRole === "admin";

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Workspaces
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mt-0.5">
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · switch, manage or create
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-app-indigo hover:bg-[#3d50c4] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg w-fit"
        >
          <FiPlus size={14}/> New Workspace
        </button>
      </div>

      {/* ── Active workspace hero card ───────────────────────── */}
      {activeWorkspace && (
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-app-indigo to-app-dark-indigo p-6 sm:p-8 text-white shadow-xl">
          {/* Decorative shimmer overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(45deg, transparent 25%, rgba(233,195,73,0.05) 50%, transparent 75%)" }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#bbc3ff]/60">
                  Active Workspace
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1 truncate">
                {activeWorkspace.name}
              </h2>
              <p className="text-[#bbc3ff]/60 text-xs tracking-widest font-bold capitalize">
                {myRole ?? "member"} · {(activeMembers ?? []).length} member{(activeMembers ?? []).length !== 1 ? "s" : ""}
              </p>

              {/* Completion bar */}
              <div className="mt-5 max-w-xs">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#bbc3ff]/60 mb-2">
                  <span>Completion</span>
                  <span>{activePct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E9C349] rounded-full transition-all duration-700"
                    style={{ width: `${activePct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[#bbc3ff]/50">
                  {activeDone} of {activeTotal} tasks completed
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-3 sm:gap-4 shrink-0">
              {[
                { label: "Backlog",  value: (activeTasks ?? []).filter(t => t.status === "todo").length,  color: "text-[#bbc3ff]" },
                { label: "Active",   value: (activeTasks ?? []).filter(t => t.status === "doing").length, color: "text-[#E9C349]" },
                { label: "Done",     value: activeDone,                                                   color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-center sm:text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#bbc3ff]/50 mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{String(s.value).padStart(2, "0")}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="relative mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <BsRobot size={13}/> Open Dashboard
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setInviteWorkspaceId(activeWorkspace._id)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <FiUserPlus size={13}/> Invite
                </button>
                <button
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <FiSettings size={13}/> Settings
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Workspace list ───────────────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-3">
          All Workspaces
        </h2>

        <div className="space-y-3">
          {workspaces.map((ws) => {
            const isActive  = ws._id === activeWorkspace?._id;
            const isDeleting = confirmDeleteId === ws._id;
            const isRenaming = renamingId === ws._id;

            return (
              <div
                key={ws._id}
                className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? "bg-app-indigo/5 dark:bg-app-indigo/20 border-app-indigo/30 dark:border-[#766ED5]/30"
                    : "bg-white dark:bg-[#1C1F2A] border-gray-100 dark:border-white/5 hover:border-[#766ED5]/20 dark:hover:border-[#766ED5]/30"
                }`}
              >
                {/* Workspace icon + name */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                    isActive
                      ? "bg-app-indigo text-white"
                      : "bg-gray-100 dark:bg-[#262A35] text-gray-500 dark:text-[#8f909d]"
                  }`}>
                    {ws.name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleRename(ws._id); if (e.key === "Escape") { setRenamingId(null); } }}
                          className="flex-1 px-2 py-1 text-sm rounded-lg border border-[#766ED5]/40 bg-white dark:bg-[#0A0E18] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#766ED5]/40"
                        />
                        <button onClick={() => handleRename(ws._id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
                          <FiCheck size={14}/>
                        </button>
                        <button onClick={() => setRenamingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262A35] rounded-lg transition-colors">
                          <FiX size={14}/>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{ws.name}</p>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#766ED5]/10 text-[#766ED5] rounded-full shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-[#8f909d] capitalize font-semibold mt-0.5">
                          {ws.role}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isRenaming && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 font-bold">Delete?</span>
                        <button
                          onClick={() => handleDelete(ws._id)}
                          disabled={deleting}
                          className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-wide rounded-lg hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {deleting ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-[#262A35] text-gray-600 dark:text-[#C6C5D4] text-[10px] font-black uppercase tracking-wide rounded-lg transition-all"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Switch */}
                        {!isActive && (
                          <button
                            onClick={() => { setActiveWorkspaceId(ws._id); navigate("/"); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-app-indigo hover:bg-[#3d50c4] text-white text-[10px] font-black uppercase tracking-wide rounded-lg transition-all active:scale-95"
                          >
                            Switch <FiChevronRight size={11}/>
                          </button>
                        )}

                        {/* Invite */}
                        {ws.role === "admin" && (
                          <button
                            onClick={() => setInviteWorkspaceId(ws._id)}
                            title="Invite"
                            className="p-2 rounded-lg text-gray-400 dark:text-[#8f909d] hover:text-[#766ED5] hover:bg-[#766ED5]/10 transition-colors"
                          >
                            <FiUserPlus size={15}/>
                          </button>
                        )}

                        {/* Rename */}
                        {ws.role === "admin" && (
                          <button
                            onClick={() => { setRenamingId(ws._id); setRenameValue(ws.name); }}
                            title="Rename"
                            className="p-2 rounded-lg text-gray-400 dark:text-[#8f909d] hover:text-[#E9C349] hover:bg-[#E9C349]/10 transition-colors"
                          >
                            <FiEdit2 size={15}/>
                          </button>
                        )}

                        {/* Members */}
                        <button
                          onClick={() => { setActiveWorkspaceId(ws._id); navigate("/settings"); }}
                          title="Members"
                          className="p-2 rounded-lg text-gray-400 dark:text-[#8f909d] hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <FiUsers size={15}/>
                        </button>

                        {/* Delete */}
                        {ws.role === "admin" && (
                          <button
                            onClick={() => setConfirmDeleteId(ws._id)}
                            title="Delete"
                            className="p-2 rounded-lg text-gray-400 dark:text-[#8f909d] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <FiTrash2 size={15}/>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create workspace panel ──────────────────────────── */}
      {showCreate && (
        <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-[#766ED5]/20 dark:border-[#766ED5]/20 p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-white mb-4">
            New Workspace
          </h3>
          <div className="flex gap-3">
            <input
              autoFocus
              type="text"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
              placeholder="e.g. Mobile App Redesign"
              className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0E18] text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#454652] focus:outline-none focus:ring-2 focus:ring-[#766ED5]/40"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newWsName.trim()}
              className="px-5 py-2.5 bg-app-indigo hover:bg-[#3d50c4] text-white rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
            >
              {creating ? "..." : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateError(""); setNewWsName(""); }}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-colors"
            >
              <FiX size={16}/>
            </button>
          </div>
          {createError && (
            <p className="mt-2 text-xs text-red-500">{createError}</p>
          )}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────── */}
      {workspaces.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BsRobot size={48} className="text-[#766ED5] opacity-30 mb-4"/>
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">No workspaces yet</h3>
          <p className="text-sm text-gray-400 dark:text-[#8f909d] mb-6 max-w-xs">
            Create your first workspace to start managing projects with AI-powered due dates.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 bg-app-indigo text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#3d50c4] transition-all active:scale-95"
          >
            <FiPlus size={14}/> Create Workspace
          </button>
        </div>
      )}

      {/* Invite modal */}
      {inviteWorkspaceId && (
        <InviteModal
          workspaceId={inviteWorkspaceId}
          onClose={() => setInviteWorkspaceId(null)}
        />
      )}
    </div>
  );
}