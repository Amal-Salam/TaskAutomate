/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiPlus, FiRefreshCw, FiCheck, FiCalendar, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props { workspaceId: string; }

export default function RetrospectivePage({ workspaceId }: Props) {
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [sprintName, setSprintName]             = useState("");
  const [startDate, setStartDate]               = useState("");
  const [endDate, setEndDate]                   = useState("");
  const [creating, setCreating]                 = useState(false);
  const [generating, setGenerating]             = useState(false);
  const [error, setError]                       = useState("");
  const [expandedSprint, setExpandedSprint]     = useState<string | null>(null);

  const sprints         = useQuery(api.sprints.list,      { workspaceId: workspaceId as any });
  const activeSprint    = useQuery(api.sprints.getActive, { workspaceId: workspaceId as any });
  const createSprint    = useMutation(api.sprints.create);
  const completeSprint  = useMutation(api.sprints.complete);
  const generateRetro   = useAction(api.ai.generateRetrospective);

  const handleCreateSprint = async () => {
    if (!sprintName.trim() || !startDate || !endDate) { setError("All fields required."); return; }
    setError(""); setCreating(true);
    try {
      await createSprint({
        workspaceId: workspaceId as any,
        name:        sprintName.trim(),
        startDate:   new Date(startDate).getTime(),
        endDate:     new Date(endDate).getTime(),
      });
      setSprintName(""); setStartDate(""); setEndDate("");
      setShowCreateSprint(false);
    } catch (e: any) { setError(e.message ?? "Failed to create sprint."); }
    finally { setCreating(false); }
  };

  const handleGenerateRetro = async (sprint: any) => {
    setGenerating(true); setError("");
    try {
      await generateRetro({
        workspaceId: workspaceId as any,
        sprintId:    sprint._id,
        sprintName:  sprint.name,
        startDate:   sprint.startDate,
        endDate:     sprint.endDate,
      });
    } catch (e: any) { setError(e.message ?? "Failed to generate retrospective."); }
    finally { setGenerating(false); }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try { await completeSprint({ sprintId: sprintId as any }); }
    catch (e: any) { setError(e.message ?? "Failed."); }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Retrospective
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mt-0.5">
            Sprint management · AI-generated retrospectives
          </p>
        </div>
        <button
          onClick={() => setShowCreateSprint(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition"
          style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
        >
          <FiPlus size={14} /> New Sprint
        </button>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

      {/* Create sprint form */}
      {showCreateSprint && (
        <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-[#766ED5]/20 p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#766ED5]">New Sprint</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint name, e.g. Sprint 1 — Auth & Onboarding"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0A0E18] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d] block mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={today}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0A0E18] text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d] block mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || today}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0A0E18] text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreateSprint(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-[#C6C5D4] hover:bg-gray-50 dark:hover:bg-[#262A35] transition"
            >
              Cancel
            </button>
            <button onClick={handleCreateSprint} disabled={creating}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
              style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
            >
              {creating ? "Creating…" : "Create Sprint"}
            </button>
          </div>
        </div>
      )}

      {/* Active sprint */}
      {activeSprint && (
        <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-[#766ED5]/30 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#766ED5]/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-black text-gray-900 dark:text-white">{activeSprint.name}</p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-widest">Active</span>
            </div>
            <button
              onClick={() => handleCompleteSprint(activeSprint._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-[#C6C5D4] hover:bg-gray-50 dark:hover:bg-[#262A35] transition"
            >
              <FiCheck size={11} /> Complete Sprint
            </button>
          </div>
          <div className="px-5 py-3 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d]">
            <span className="flex items-center gap-1">
              <FiCalendar size={10} />
              {new Date(activeSprint.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {" → "}
              {new Date(activeSprint.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      )}

      {/* Sprint history */}
      <div className="space-y-3">
        <p className="label-xs text-gray-500 dark:text-[#8f909d]">Sprint History</p>

        {(!sprints || sprints.filter(s => s.status === "completed").length === 0) && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-300 dark:text-[#454652]">
            <BsRobot size={28} className="opacity-30" />
            <p className="text-xs">Complete a sprint to generate your first retrospective</p>
          </div>
        )}

        {(sprints ?? []).filter(s => s.status === "completed").map((sprint) => {
          const isExpanded = expandedSprint === sprint._id;
          const retro      = sprint.retrospective;

          return (
            <div key={sprint._id} className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
              {/* Sprint header */}
              <button
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#262A35] transition"
                onClick={() => setExpandedSprint(isExpanded ? null : sprint._id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{sprint.name}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#454652]/20 text-[#8f909d] uppercase">Completed</span>
                  {retro && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#766ED5]/10 text-[#766ED5] uppercase flex items-center gap-1"><BsRobot size={9} /> Retro Ready</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 dark:text-[#8f909d]">
                    {new Date(sprint.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} → {new Date(sprint.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {isExpanded ? <FiChevronUp size={15} className="text-gray-400" /> : <FiChevronDown size={15} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded retrospective */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-white/5 p-5 space-y-4">
                  {!retro ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400 dark:text-[#8f909d] mb-3">No retrospective generated yet.</p>
                      <button
                        onClick={() => handleGenerateRetro(sprint)}
                        disabled={generating}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
                        style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
                      >
                        <FiRefreshCw size={12} className={generating ? "animate-spin" : ""} />
                        {generating ? "Generating…" : "Generate AI Retrospective"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="rounded-xl bg-[#766ED5]/5 border border-[#766ED5]/15 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BsRobot size={13} style={{ color: "#766ED5" }} />
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">Sprint Summary</p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-[#C6C5D4]">{retro.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Went well */}
                        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">✓ Went Well</p>
                          <ul className="space-y-1.5">
                            {retro.wentWell.map((item: string, i: number) => (
                              <li key={i} className="text-xs text-gray-700 dark:text-[#C6C5D4] flex items-start gap-1.5">
                                <FiCheck size={10} className="text-emerald-400 mt-0.5 shrink-0" /> {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Went poorly */}
                        <div className="rounded-xl bg-[#FFB2BE]/5 border border-[#FFB2BE]/15 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#FFB2BE] mb-2">✗ Needs Improvement</p>
                          <ul className="space-y-1.5">
                            {retro.wentPoorly.map((item: string, i: number) => (
                              <li key={i} className="text-xs text-gray-700 dark:text-[#C6C5D4] flex items-start gap-1.5">
                                <span className="text-[#FFB2BE] shrink-0 mt-0.5">×</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* AI vs Actual */}
                      <div className="rounded-xl bg-[#E9C349]/5 border border-[#E9C349]/15 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#E9C349] mb-2">AI Predictions vs Actual</p>
                        <p className="text-xs text-gray-700 dark:text-[#C6C5D4]">{retro.aiVsActual}</p>
                      </div>

                      {/* Recommendations */}
                      <div className="rounded-xl bg-[#766ED5]/5 border border-[#766ED5]/15 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5] mb-2">Recommendations for Next Sprint</p>
                        <ul className="space-y-1.5">
                          {retro.recommendations.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-gray-700 dark:text-[#C6C5D4] flex items-start gap-1.5">
                              <span className="text-[#766ED5] font-black shrink-0">{i + 1}.</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="text-[10px] text-gray-400 dark:text-[#454652] text-right">
                        Generated {new Date(retro.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}