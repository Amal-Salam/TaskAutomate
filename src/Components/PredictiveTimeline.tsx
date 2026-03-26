/* eslint-disable prettier/prettier */
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useState } from "react";
import { BsActivity,BsRobot } from "react-icons/bs";
import { FiRefreshCw } from "react-icons/fi";

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
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [error, setError] = useState("");

  const suggestDueDates = useAction(api.ai.suggestDueDates);

  const handleSuggest = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await suggestDueDates({ workspaceId: workspaceId as any });
      setSuggestions((result as Suggestion[]) ?? []);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError("Failed to generate suggestions. Check your GEMINI_API_KEY.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-indigo dark:text-white flex items-center gap-2">
          <BsActivity size={20} className="text-iris" />
          Predictive Timeline 
        </h2>
        <button
          onClick={handleSuggest}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-glossy-gold animate-shimmer text-white rounded-lg hover:bg-glossy-gold/80 disabled:opacity-50 transition"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Thinking..." : suggestions.length ? "Re-analyse" : "Suggest Due Dates"}
        </button>
      </div>

      {lastRun && (
        <p className="text-xs text-gray-400 mb-3">Last updated at {lastRun}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-3">
          {error}
        </p>
      )}

      {suggestions.length === 0 && !loading && (
        <div className="h-32 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <BsActivity size={28} className="opacity-30" />
          <p>Click "Suggest Due Dates" to analyse your tasks</p>
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-iris/5 border border-iris/20 hover:bg-iris/10 transition"
          >
            <BsRobot size={16} className="text-iris mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo dark:text-white truncate">
                {s.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>
            </div>
            <span className="text-xs font-semibold text-iris bg-iris/10 px-2 py-1 rounded-lg whitespace-nowrap">
              {new Date(s.suggestedDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
