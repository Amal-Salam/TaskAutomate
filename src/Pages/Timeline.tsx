/* eslint-disable prettier/prettier */
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useState } from "react";
import BurndownChart from "../Components/BurndownChart.js";
import { BsActivity, BsRobot } from "react-icons/bs";
import { FiRefreshCw, FiZap, FiCheck, FiX } from "react-icons/fi";

interface Props {
  workspaceId: string;
}

interface Suggestion {
  id: string;
  title: string;
  suggestedDate: string;
  reason: string;
}

export default function PredictiveTimeline({ workspaceId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [lastRun, setLastRun]         = useState<string | null>(null);
  const [error, setError]             = useState("");
  const [focusSuggestions, setFocusSuggestions] = useState<any[]>([]);

  const suggestDueDates = useAction(api.ai.suggestDueDates);
  const acceptAI        = useMutation(api.tasks.acceptAISuggestion);
  const overrideAI      = useMutation(api.tasks.overrideAISuggestion);
  const suggestFocus = useAction(api.ai.suggestFocusTime);

  const tasks   = useQuery(api.tasks.list, { workspaceId: workspaceId as any });
  const allTasks = tasks ?? [];
  const pending  = allTasks.filter(t => t.iddSuggested);

  const handleSuggest = async () => {
    setLoading(true);
    setError("");
    try {
      const [result, focusResult] = await Promise.all([
        suggestDueDates({ workspaceId: workspaceId as any }),
        suggestFocus({workspaceId: workspaceId as any})
      ]);
      setSuggestions((result as Suggestion[]) ?? []);
      setFocusSuggestions(focusResult ?? []);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError("Failed to generate suggestions. Check your GEMINI_API_KEY.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try { await acceptAI({ taskId: id as any }); } catch (e) { console.error(e); }
  };

  const handleOverride = async (id: string, d?: number) => {
    try { await overrideAI({ taskId: id as any, manualDate: d }); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <BsActivity size={20} className="text-[#766ED5]"/>
            Predictive Timeline
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mt-0.5">
            AI-powered due date analysis
          </p>
        </div>
        <button
          onClick={handleSuggest}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg hover:scale-[0.97] transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          {loading ? "Thinking…" : suggestions.length ? "Re-analyse" : "Suggest Due Dates"}
        </button>
      </div>

      {lastRun && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d]">
          Last updated at {lastRun}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      

      {/* ── AI Suggestions Review ────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="bg-white dark:bg-app-indigo/30 backdrop-blur-md  rounded-xl border border-[#766ED5]/20 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-white/5">
            <FiZap size={13} className="text-[#766ED5]"/>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">
              Pending AI Suggestions — {pending.length} awaiting review
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {pending.map(task => (
              <div
                key={task._id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#8f909d] mt-0.5">
                    AI suggests{" "}
                    <span className="text-[#766ED5] font-semibold">
                      {new Date(task.iddSuggested!).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    {task.aiReason && <span> — {task.aiReason}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAccept(task._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wide rounded-lg hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    <FiCheck size={11}/> Accept
                  </button>
                  <button
                    onClick={() => handleOverride(task._id, task.dueDate)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-[#0A0E18] text-gray-600 dark:text-[#C6C5D4] text-[10px] font-black uppercase tracking-wide rounded-lg hover:bg-gray-200 dark:hover:bg-[#262A35] transition-all active:scale-95"
                  >
                    <FiX size={11}/> Keep mine
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      

      {/* ── Timeline Suggestions ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#151b2d]/70 backdrop-blur-md rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
          <BsRobot size={14} className="text-[#766ED5]"/>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">
            AI Date Analysis
          </p>
        </div>

        {suggestions.length === 0 && !loading ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-300 dark:text-[#454652] gap-2">
            <BsActivity size={28} className="opacity-30"/>
            <p className="text-xs">Click "Suggest Due Dates" to analyse your tasks</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {suggestions.map(s => (
              <div
                key={s.id}
                className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-colors"
              >
                <BsRobot size={15} className="text-[#766ED5] mt-0.5 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.title}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#8f909d] mt-0.5">{s.reason}</p>
                </div>
                <span className="text-[10px] font-black text-[#766ED5] bg-[#766ED5]/10 px-2 py-1 rounded-lg whitespace-nowrap">
                  {new Date(s.suggestedDate).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Insert the BurndownChart section */}
      <section className="bg-white dark:bg-[#151b2d]/70 backdrop-blur-md rounded-xl border border-gray-100 dark:border-white/5 p-5">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-4">
          Project Progress
        </h2>
        <BurndownChart workspaceId={workspaceId} />
      </section>

      {focusSuggestions.length > 0 && (
  <div className="mt-4 p-4 rounded-xl bg-iris/5 border border-iris/10">
    <h3 className="text-xs font-bold text-iris mb-2">AI Suggested Focus Blocks</h3>
    {focusSuggestions.map((block, i) => (
      <p key={i} className="text-sm text-gray-700 dark:text-gray-300">
        {block.time}: {block.activity}
      </p>
    ))}
  </div>
)}

    </div>
    
  );
}