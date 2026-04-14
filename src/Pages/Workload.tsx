/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiRefreshCw, FiUsers, FiAlertTriangle, FiCheck, FiClock } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props { workspaceId: string; }

export default function WorkloadPage({ workspaceId }: Props) {
  const [workloadData, setWorkloadData]   = useState<any>(null);
  const [anomalyData, setAnomalyData]     = useState<any>(null);
  const [loadingWL, setLoadingWL]         = useState(false);
  const [loadingAN, setLoadingAN]         = useState(false);
  const [error, setError]                 = useState("");

  const suggestBalance    = useAction(api.ai.suggestWorkloadBalance);
  const detectAnomalies   = useAction(api.ai.detectVelocityAnomalies);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const members           = useQuery(api.workspaces.listMembers, { workspaceId: workspaceId as any });

  const handleWorkload = async () => {
    setLoadingWL(true); setError("");
    try { setWorkloadData(await suggestBalance({ workspaceId: workspaceId as any })); }
    catch (e: any) { setError(e.message ?? "Failed."); }
    finally { setLoadingWL(false); }
  };

  const handleAnomalies = async () => {
    setLoadingAN(true); setError("");
    try { setAnomalyData(await detectAnomalies({ workspaceId: workspaceId as any })); }
    catch (e: any) { setError(e.message ?? "Failed."); }
    finally { setLoadingAN(false); }
  };

  const maxPoints = workloadData?.workload
    ? Math.max(...workloadData.workload.map((m: any) => m.points), 1)
    : 1;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Workload & Anomalies
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mt-0.5">
            AI-powered resource balancing · velocity anomaly detection
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleWorkload}
            disabled={loadingWL}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
            style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
          >
            <FiRefreshCw size={12} className={loadingWL ? "animate-spin" : ""} />
            {loadingWL ? "Analysing…" : "Balance Workload"}
          </button>
          <button
            onClick={handleAnomalies}
            disabled={loadingAN}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-[#766ED5]/30 text-[#766ED5] hover:bg-[#766ED5]/10 disabled:opacity-50 transition"
          >
            <FiAlertTriangle size={12} className={loadingAN ? "animate-pulse" : ""} />
            {loadingAN ? "Detecting…" : "Detect Anomalies"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

      {/* ── Workload Section ──────────────────────────────────────────────── */}
      {workloadData && (
        <div className="space-y-4">
          {/* AI Summary */}
          <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-[#766ED5]/20 p-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <BsRobot size={14} style={{ color: "#766ED5" }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">AI Workload Analysis</p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#766ED5]/10 text-[#766ED5]">
                Balance score: {workloadData.balanceScore}/100
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-[#C6C5D4]">{workloadData.summary}</p>

            {workloadData.overloaded?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB2BE]">Overloaded:</span>
                {workloadData.overloaded.map((name: string) => (
                  <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFB2BE]/10 text-[#FFB2BE] font-bold">{name}</span>
                ))}
              </div>
            )}
            {workloadData.underutilized?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981]">Has Capacity:</span>
                {workloadData.underutilized.map((name: string) => (
                  <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">{name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Member workload bars */}
          <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FiUsers size={14} style={{ color: "#766ED5" }} /> Team Workload Distribution
              </h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {workloadData.workload.map((m: any) => {
                const barPct = Math.round((m.points / maxPoints) * 100);
                const isOver = workloadData.overloaded?.includes(m.name);
                const isUnder = workloadData.underutilized?.includes(m.name);
                const barColor = isOver ? "#FFB2BE" : isUnder ? "#10b981" : "#766ED5";
                return (
                  <div key={m.userId} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#766ED5]/15 flex items-center justify-center text-xs font-black text-[#766ED5]">
                          {m.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-[#8f909d] uppercase tracking-wide">{m.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black" style={{ color: barColor }}>{m.points}pt</p>
                        <p className="text-[10px] text-gray-400 dark:text-[#8f909d]">{m.taskCount} tasks{m.overdue > 0 ? ` · ${m.overdue} overdue` : ""}</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-[#0A0E18] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {workloadData.recommendations?.length > 0 && (
            <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Recommended Reassignments</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {workloadData.recommendations.map((r: any, idx: number) => (
                  <div key={idx} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8f909d] shrink-0">
                      <span className="font-bold text-gray-700 dark:text-[#C6C5D4]">{r.from}</span>
                      <span>→</span>
                      <span className="font-bold text-[#766ED5]">{r.to}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">"{r.taskTitle}"</p>
                      <p className="text-[10px] text-gray-400 dark:text-[#8f909d]">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Anomaly Section ───────────────────────────────────────────────── */}
      {anomalyData && (
        <div className="space-y-4">
          {/* AI summary */}
          {anomalyData.aiSummary && (
            <div className={`rounded-xl border p-4 space-y-1 ${
              anomalyData.aiSummary.urgency === "high"
                ? "border-[#FFB2BE]/30 bg-[#FFB2BE]/5"
                : anomalyData.aiSummary.urgency === "medium"
                ? "border-[#E9C349]/30 bg-[#E9C349]/5"
                : "border-emerald-500/20 bg-emerald-500/5"
            }`}>
              <div className="flex items-center gap-2">
                <BsRobot size={13} style={{ color: "#766ED5" }} />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">Anomaly Analysis</p>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                  anomalyData.aiSummary.urgency === "high" ? "bg-[#FFB2BE]/20 text-[#FFB2BE]"
                  : anomalyData.aiSummary.urgency === "medium" ? "bg-[#E9C349]/20 text-[#E9C349]"
                  : "bg-emerald-500/20 text-emerald-400"
                }`}>{anomalyData.aiSummary.urgency}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-[#C6C5D4]">{anomalyData.aiSummary.summary}</p>
              <p className="text-xs font-semibold text-[#766ED5]">→ {anomalyData.aiSummary.topAction}</p>
            </div>
          )}

          {!anomalyData.aiSummary && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <FiCheck size={14} className="text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">{anomalyData.summary}</p>
            </div>
          )}

          {/* Member velocity stats */}
          {anomalyData.memberStats?.length > 0 && (
            <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Member Velocity (This Week vs Average)</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {anomalyData.memberStats.map((m: any) => (
                  <div key={m.userId} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-[#766ED5]/15 flex items-center justify-center text-xs font-black text-[#766ED5] shrink-0">
                      {m.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</p>
                        {m.isAnomaly && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                            m.direction === "drop" ? "bg-[#FFB2BE]/15 text-[#FFB2BE]" : "bg-[#E9C349]/15 text-[#E9C349]"
                          }`}>
                            {m.direction === "drop" ? "↓ Drop" : "↑ Spike"}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-[#8f909d]">
                        This week: {m.thisWeekPoints}pt · Avg: {m.avgWeeklyPoints}pt/week
                      </p>
                    </div>
                    {m.totalCompleted > 0 && (
                      <p className="text-[10px] font-black text-gray-400 dark:text-[#8f909d] shrink-0">
                        {m.totalCompleted} completed
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Long-running tasks */}
          {anomalyData.longRunning?.length > 0 && (
            <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-[#FFB2BE]/20 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#FFB2BE]/10 flex items-center gap-2">
                <FiClock size={13} style={{ color: "#FFB2BE" }} />
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Long-Running Tasks</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFB2BE]/10 text-[#FFB2BE]">
                  {anomalyData.longRunning.length} flagged
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {anomalyData.longRunning.map((t: any) => (
                  <div key={t.taskId} className="px-5 py-3 flex items-center gap-3">
                    <FiAlertTriangle size={13} style={{ color: "#FFB2BE" }} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">"{t.title}"</p>
                      <p className="text-[10px] text-gray-400 dark:text-[#8f909d]">
                        {t.daysInProgress} days in progress · expected {t.expectedDays} days · {t.storyPoints}pt · {t.assigneeName}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-[#FFB2BE] bg-[#FFB2BE]/10 px-2 py-0.5 rounded-full shrink-0">
                      {Math.round(t.daysInProgress / t.expectedDays)}x overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!workloadData && !anomalyData && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-300 dark:text-[#454652]">
          <FiUsers size={32} className="opacity-30" />
          <p className="text-sm">Run an analysis to see team workload and velocity anomalies</p>
        </div>
      )}
    </div>
  );
}