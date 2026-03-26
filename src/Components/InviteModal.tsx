/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiX, FiMail, FiTrash2, FiClock } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export default function InviteModal({ workspaceId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const sendInvite = useAction(api.sendInvite.sendInvite);
  const revokeInvite = useMutation(api.invites.revoke);
  const pendingInvites = useQuery(api.invites.listByWorkspace, {
    workspaceId: workspaceId as any,
  });

  const handleSend = async () => {
    if (!email.trim()) { setError("Enter an email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    setError("");
    setSuccess("");
    setSending(true);
    try {
      await sendInvite({
        workspaceId: workspaceId as any,
        email: email.trim().toLowerCase(),
        role,
      });
      setSuccess(`Invite sent to ${email.trim()}`);
      setEmail("");
    } catch (e: any) {
      setError(e.message ?? "Failed to send invite. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await revokeInvite({ inviteId: inviteId as any });
    } catch (e) {
      console.error(e);
    }
  };

  const daysLeft = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d left` : "Expired";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-indigo dark:text-white flex items-center gap-2">
            <FiMail className="text-iris" size={20} />
            Invite teammates
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <FiX size={20} />
          </button>
        </div>

        {/* Email input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="teammate@company.com"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="w-full py-2 bg-iris text-white rounded-lg text-sm font-semibold hover:bg-iris/80 disabled:opacity-50 transition"
          >
            {sending ? "Sending..." : "Send invite"}
          </button>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
            <BsRobot size={14} />
            {success}
          </div>
        )}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Pending invites */}
        {pendingInvites && pendingInvites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pending invites
            </p>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div>
                    <p className="text-sm text-gray-800 dark:text-white">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 capitalize">{invite.role}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <FiClock size={10} />
                        {daysLeft(invite.expiresAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(invite._id)}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                    title="Revoke invite"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Invites expire after 7 days. Admins can manage all workspace settings.
        </p>
      </div>
    </div>
  );
}