/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiX, FiZap, FiCheck, FiUser, FiCalendar, FiChevronRight } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props {
  workspaceId: string;
  onClose: () => void;
  onTasksCreated?: () => void;
}

interface Subtask {
  title: string;
  description: string;
  storyPoints: number;
  suggestedAssigneeName: string | null;
  suggestedAssigneeId: string | null;
  suggestedDueDate: string;
  reason: string;
  selected: boolean;
}

export default function GoalDecomposer({ workspaceId, onClose, onTasksCreated }: Props) {
  const [goal, setGoal]           = useState("");
  const [subtasks, setSubtasks]   = useState<Subtask[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState("");
  const [step, setStep]           = useState<"input" | "review">("input");

  const decomposeGoal = useAction(api.ai.decomposeGoal);
  const createTask    = useMutation(api.tasks.create);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const members       = useQuery(api.workspaces.listMembers, { workspaceId: workspaceId as any });

  const handleDecompose = async () => {
    if (!goal.trim()) { setError("Enter a goal first."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await decomposeGoal({ workspaceId: workspaceId as any, goal: goal.trim() });
      setSubtasks(result.map((s: any) => ({ ...s, selected: true })));
      setStep("review");
    } catch (e: any) {
      setError(e.message ?? "Decomposition failed. Try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) =>
    setSubtasks(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));

  const handleCreateSelected = async () => {
    const selected = subtasks.filter(s => s.selected);
    if (selected.length === 0) { setError("Select at least one subtask."); return; }
    setError("");
    setCreating(true);
    try {
      for (const s of selected) {
        await createTask({
          workspaceId:  workspaceId as any,
          title:        s.title,
          description:  s.description,
          status:       "todo",
          storyPoints:  s.storyPoints,
          assigneeId:   s.suggestedAssigneeId ? s.suggestedAssigneeId as any : undefined,
          dueDate:      s.suggestedDueDate ? new Date(s.suggestedDueDate).getTime() : undefined,
          parentGoal:   goal.trim(),
          isDecomposed: true,
        });
      }
      onTasksCreated?.();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to create tasks.");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-[#1C1F2A] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ border: "1px solid var(--clr-border, rgba(99,102,241,0.15))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(118,110,213,0.15)",
              border: "1px solid rgba(118,110,213,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BsRobot size={16} style={{ color: "#766ED5" }} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
                Goal Decomposer
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-[#8f909d]">
                AI breaks your goal into actionable subtasks
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1">
            <FiX size={18} />
          </button>
        </div>

        {/* Step 1 — Goal input */}
        {step === "input" && (
          <div className="p-6 space-y-4">
            <div>
              <label className="label-xs text-gray-500 dark:text-[#8f909d] block mb-2">
                Describe your high-level goal
              </label>
              <textarea
                autoFocus
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDecompose(); }}
                rows={3}
                placeholder='e.g. "Launch the ForeSight marketing campaign" or "Set up CI/CD pipeline for production"'
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0A0E18] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 resize-none"
                style={{ focusRingColor: "#766ED5" } as any}
              />
              <p className="text-[10px] text-gray-400 dark:text-[#8f909d] mt-1">
                Tip: ⌘+Enter to decompose
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-[#C6C5D4] hover:bg-gray-50 dark:hover:bg-[#262A35] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDecompose}
                disabled={loading || !goal.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
                style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
              >
                <FiZap size={14} className={loading ? "animate-pulse" : ""} />
                {loading ? "Decomposing…" : "Decompose Goal"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Review subtasks */}
        {step === "review" && (
          <>
            {/* Goal banner */}
            <div className="px-6 py-3 bg-[#766ED5]/5 border-b border-[#766ED5]/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5] mb-0.5">Goal</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{goal}</p>
            </div>

            {/* Subtask list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="label-xs text-gray-500 dark:text-[#8f909d]">
                  {subtasks.filter(s => s.selected).length}/{subtasks.length} subtasks selected
                </p>
                <button
                  onClick={() => setSubtasks(prev => prev.map(s => ({ ...s, selected: !prev.every(x => x.selected) })))}
                  className="text-[10px] font-black uppercase tracking-widest text-[#766ED5] hover:text-[#766ED5]/80 transition"
                >
                  {subtasks.every(s => s.selected) ? "Deselect all" : "Select all"}
                </button>
              </div>

              {subtasks.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    s.selected
                      ? "border-[#766ED5]/40 bg-[#766ED5]/5 dark:bg-[#766ED5]/10"
                      : "border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0E18] opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      s.selected ? "bg-[#766ED5] border-[#766ED5]" : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {s.selected && <FiCheck size={11} className="text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{s.title}</p>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#766ED5]/10 text-[#766ED5]">
                          {s.storyPoints}pt
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-[#8f909d] mb-2 line-clamp-2">{s.description}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {s.suggestedAssigneeName && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] flex items-center gap-1">
                            <FiUser size={10} /> {s.suggestedAssigneeName}
                          </span>
                        )}
                        {s.suggestedDueDate && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] flex items-center gap-1">
                            <FiCalendar size={10} />
                            {new Date(s.suggestedDueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        <span className="text-[10px] text-[#766ED5]/70 italic">{s.reason}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="px-4 pb-2">
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
              <button
                onClick={() => { setStep("input"); setSubtasks([]); }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-[#C6C5D4] hover:bg-gray-50 dark:hover:bg-[#262A35] transition"
              >
                ← Back
              </button>
              <button
                onClick={handleCreateSelected}
                disabled={creating || subtasks.filter(s => s.selected).length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
                style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
              >
                <FiChevronRight size={14} />
                {creating ? "Creating…" : `Create ${subtasks.filter(s => s.selected).length} Tasks`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}