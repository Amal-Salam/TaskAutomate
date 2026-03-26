/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useWorkspace } from "../Lib/WorkspaceContext.js";
import { useNavigate } from "react-router-dom";
import { FiEdit2, FiTrash2, FiCheck, FiX, FiShield, FiUser, FiUserMinus } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

export default function WorkspaceSettings() {
  const { activeWorkspace, setActiveWorkspaceId, workspaces } = useWorkspace();
  const navigate = useNavigate();

  const members = useQuery(
    api.workspaces.listMembers,
    activeWorkspace ? { workspaceId: activeWorkspace._id as any } : "skip"
  );

  const myUserId = useQuery(api.tasks.getMyUserId);

  const renameMutation = useMutation(api.workspaces.rename);
  const removeMemberMutation = useMutation(api.workspaces.removeMember);
  const changeRoleMutation = useMutation(api.workspaces.changeMemberRole);
  const deleteWorkspaceMutation = useMutation(api.workspaces.deleteWorkspace);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(activeWorkspace?.name ?? "");
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = activeWorkspace?.role === "admin";

  const handleRename = async () => {
    if (!newName.trim() || !activeWorkspace) return;
    setRenaming(true);
    setError("");
    try {
      await renameMutation({
        workspaceId: activeWorkspace._id as any,
        name: newName.trim(),
      });
      setEditingName(false);
      setSuccess("Workspace renamed successfully.");
    } catch (e: any) {
      setError(e.message ?? "Failed to rename workspace.");
    } finally {
      setRenaming(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeWorkspace) return;
    if (!window.confirm(`Remove ${memberName} from this workspace?`)) return;
    setError("");
    try {
      await removeMemberMutation({
        workspaceId: activeWorkspace._id as any,
        memberId: memberId as any,
      });
      setSuccess(`${memberName} has been removed.`);
    } catch (e: any) {
      setError(e.message ?? "Failed to remove member.");
    }
  };

  const handleChangeRole = async (
    memberId: string,
    currentRole: "admin" | "member",
    memberName: string
  ) => {
    if (!activeWorkspace) return;
    const newRole = currentRole === "admin" ? "member" : "admin";
    setError("");
    try {
      await changeRoleMutation({
        workspaceId: activeWorkspace._id as any,
        memberId: memberId as any,
        role: newRole,
      });
      setSuccess(`${memberName} is now a ${newRole}.`);
    } catch (e: any) {
      setError(e.message ?? "Failed to change role.");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!confirmDelete || !activeWorkspace) return;
    setDeleting(true);
    setError("");
    try {
      await deleteWorkspaceMutation({
        workspaceId: activeWorkspace._id as any,
      });
      // Switch to another workspace or go home
      const remaining = workspaces.filter((w) => w._id !== activeWorkspace._id);
      if (remaining.length > 0) {
        setActiveWorkspaceId(remaining[0]._id);
      }
      navigate("/");
    } catch (e: any) {
      setError(e.message ?? "Failed to delete workspace.");
      setDeleting(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-sm">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-indigo dark:text-white">Workspace Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage <span className="font-medium text-indigo dark:text-white">{activeWorkspace.name}</span>
        </p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
          <FiCheck size={14} /> {success}
        </div>
      )}

      {/* ── Workspace Name ───────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-indigo dark:text-white">Workspace name</h2>

        {editingName ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
            />
            <button
              onClick={handleRename}
              disabled={renaming || !newName.trim()}
              className="px-4 py-2 bg-iris text-white rounded-lg text-sm font-semibold hover:bg-iris/80 disabled:opacity-50 transition"
            >
              {renaming ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setEditingName(false); setNewName(activeWorkspace.name); }}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <FiX size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">{activeWorkspace.name}</p>
            {isAdmin && (
              <button
                onClick={() => { setEditingName(true); setNewName(activeWorkspace.name); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-iris border border-gray-200 dark:border-gray-700 rounded-lg hover:border-iris/40 transition"
              >
                <FiEdit2 size={13} /> Rename
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Members ──────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-indigo dark:text-white">
          Members ({members?.length ?? 0})
        </h2>

        <div className="space-y-2">
          {(members ?? []).map((m) => {
            const isMe = m.userId === myUserId?.toString();
            return (
              <div
                key={m.memberId}
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-iris/20 flex items-center justify-center text-xs font-bold text-iris shrink-0">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-indigo dark:text-white truncate">
                      {m.name} {isMe && <span className="text-gray-400 font-normal">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  </div>
                </div>

                {/* Role badge + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    m.role === "admin"
                      ? "bg-iris/10 text-iris"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}>
                    {m.role === "admin" ? <FiShield size={10} /> : <FiUser size={10} />}
                    {m.role}
                  </span>

                  {isAdmin && (
                    <>
                      {/* Toggle role */}
                      <button
                        onClick={() => handleChangeRole(m.memberId, m.role, m.name)}
                        title={m.role === "admin" ? "Grant member Access" : "Make admin"}
                        className="p-1.5 text-gray-400 hover:text-iris rounded-lg hover:bg-iris/10 transition"
                      >
                        {m.role === "admin" ? <FiUser size={14} /> : <FiShield size={14} />}
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemoveMember(m.memberId, m.name)}
                        title="Remove member"
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <FiUserMinus size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Danger Zone ──────────────────────────────────── */}
      {isAdmin && (
        <div className="card p-6 space-y-4 border border-red-200 dark:border-red-900">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <FiTrash2 size={16} /> Danger zone
          </h2>
          <p className="text-sm text-gray-500">
            Deleting this workspace permanently removes all tasks, members, and invites. This cannot be undone.
          </p>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              Delete workspace
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-red-600">Are you sure? This is permanent.</p>
              <button
                onClick={handleDeleteWorkspace}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Read-only notice for non-admins */}
      {!isAdmin && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-500">
          <BsRobot size={14} className="text-iris" />
          You have member access. Contact a workspace admin to make changes.
        </div>
      )}
    </div>
  );
}