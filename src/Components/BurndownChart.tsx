/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiRefreshCw, FiTrendingDown, FiAlertTriangle, FiCheck } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props { workspaceId: string; }

interface BurndownResult {
  remainingPoints:  number;
  totalPoints:      number;
  donePoints:       number;
  avgVelocity:      number;
  stdDev:           number;
  optimistic:       { days: number; date: string };
  mostLikely:       { days: number; date: string };
  pessimistic:      { days: number; date: string };
  onTimeProb:       number | null;
  nearestDeadline:  string | null;
  aiInterpretation: { interpretation: string; riskLevel: string; keyAction: string };
  simulationRuns:   number;
}

const RISK_COLORS: Record<string, string> = {
  low:    "#10b981",
  medium: "#E9C349",
  high:   "#FFB2BE",
};

export default function BurndownChart({ workspaceId }: Props) {
  const [result, setResult]   = useState<BurndownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [lastRun, setLastRun] = useState<string | null>(null);

  const predictBurndown = useAction(api.ai.predictBurndown);

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await predictBurndown({ workspaceId: workspaceId as any });
      setResult(data as BurndownResult);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message ?? "Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  const pct = result ? Math.round((result.donePoints / Math.max(result.totalPoints, 1)) * 100) : 0;
  const riskColor = result ? RISK_COLORS[result.aiInterpretation.riskLevel] ?? "#8f909d" : "#8f909d";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiTrendingDown size={14} style={{ color: "#766ED5" }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
            Burndown Prediction
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#766ED5]/10 text-[#766ED5] uppercase">
            Monte Carlo · {result?.simulationRuns ?? 1000} runs
          </span>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
          style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
        >
          <FiRefreshCw size={11} className={loading ? "animate-spin" : ""} />
          {loading ? "Simulating…" : result ? "Re-run" : "Predict"}
        </button>
      </div>

      {lastRun && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d]">
          Last run at {lastRun}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
      )}

      {!result && !loading && (
        <div className="h-32 flex flex-col items-center justify-center text-gray-300 dark:text-[#454652] gap-2">
          <FiTrendingDown size={28} className="opacity-30" />
          <p className="text-xs">Run the simulation to predict project completion</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8f909d]">Overall Progress</span>
              <span className="text-[10px] font-black text-white">{pct}% · {result.donePoints}/{result.totalPoints} pts</span>
            </div>
            <div className="w-full h-2 bg-[#0A0E18] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #766ED5, #BBC3FF)" }}
              />
            </div>
          </div>

          {/* Confidence interval bands */}
          <div className="rounded-xl border border-white/5 bg-[#0A0E18] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8f909d]">
                Completion Forecast (P10 / P50 / P90)
              </p>
            </div>

            {/* Visual band */}
            <div className="px-4 py-4">
              <div className="relative h-10 rounded-xl overflow-hidden">
                {/* P10 → P90 band */}
                <div className="absolute inset-y-0 rounded-xl" style={{
                  left: "0%", right: "0%",
                  background: "linear-gradient(90deg, rgba(16,185,129,0.15), rgba(233,195,73,0.15), rgba(255,178,190,0.15))",
                }} />
                {/* P50 marker */}
                <div className="absolute inset-y-0 flex items-center" style={{ left: "50%", transform: "translateX(-50%)" }}>
                  <div className="w-0.5 h-full bg-[#E9C349]" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-widest">
                <span style={{ color: "#10b981" }}>Best: {result.optimistic.date}</span>
                <span style={{ color: "#E9C349" }}>Likely: {result.mostLikely.date}</span>
                <span style={{ color: "#FFB2BE" }}>Worst: {result.pessimistic.date}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 border-t border-white/5">
              {[
                { label: "Optimistic", days: result.optimistic.days, date: result.optimistic.date, color: "#10b981" },
                { label: "Most Likely", days: result.mostLikely.days, date: result.mostLikely.date, color: "#E9C349" },
                { label: "Pessimistic", days: result.pessimistic.days, date: result.pessimistic.date, color: "#FFB2BE" },
              ].map((s, i) => (
                <div key={s.label} className={`px-3 py-3 ${i < 2 ? "border-r border-white/5" : ""}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: s.color }}>
                    {s.label}
                  </p>
                  <p className="text-xl font-black text-white">{s.days}<span className="text-xs text-[#8f909d] ml-1">days</span></p>
                  <p className="text-[9px] text-[#8f909d] mt-0.5">{s.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* On-time probability */}
          {result.onTimeProb !== null && (
            <div className="rounded-xl border p-4 flex items-center gap-4" style={{
              borderColor: `${riskColor}30`,
              background:  `${riskColor}08`,
            }}>
              {/* Circular indicator */}
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#0A0E18" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" strokeWidth="5"
                    stroke={riskColor}
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - result.onTimeProb / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.7s ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                  {result.onTimeProb}%
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: riskColor }}>
                  On-time Probability
                </p>
                <p className="text-sm font-bold text-white">
                  Nearest deadline: {result.nearestDeadline}
                </p>
                <p className="text-[10px] text-[#8f909d]">
                  Avg velocity: {result.avgVelocity} pts/day (±{result.stdDev})
                </p>
              </div>
            </div>
          )}

          {/* AI interpretation */}
          <div className="rounded-xl border border-[#766ED5]/20 bg-[#766ED5]/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BsRobot size={13} style={{ color: "#766ED5" }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">AI Analysis</p>
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                style={{ background: `${riskColor}20`, color: riskColor }}
              >
                {result.aiInterpretation.riskLevel} risk
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-[#C6C5D4] leading-relaxed">
              {result.aiInterpretation.interpretation}
            </p>
            <div className="flex items-start gap-2 pt-1">
              {result.aiInterpretation.riskLevel === "low"
                ? <FiCheck size={12} style={{ color: "#10b981", marginTop: 2 }} />
                : <FiAlertTriangle size={12} style={{ color: riskColor, marginTop: 2 }} />
              }
              <p className="text-xs font-semibold" style={{ color: riskColor }}>
                {result.aiInterpretation.keyAction}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}