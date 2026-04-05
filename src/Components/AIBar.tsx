/* eslint-disable prettier/prettier */
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { BsRobot } from "react-icons/bs";


interface Props {
  workspaceId: string;
}

export default function AIIntelligenceBar({ workspaceId }: Props) {
  const tasks = useQuery(api.tasks.list, { workspaceId: workspaceId as any });

  const total = tasks?.length ?? 0;
  const atRisk = tasks?.filter(
    (t) =>
      t.iddSuggested &&
      t.dueDate &&
      t.iddSuggested < t.dueDate &&
      t.status !== "done"
  ).length ?? 0;
  const suggested = tasks?.filter((t) => t.iddSuggested).length ?? 0;

  const message =
    !tasks
      ? "Analysing your workspace..."
      : atRisk > 0
      ? `⚠️ ${atRisk} task${atRisk > 1 ? "s" : ""} at risk of slipping — check Predictive Timeline`
      : suggested > 0
      ? `AI has reviewed ${suggested} of ${total} task${total !== 1 ? "s" : ""} — your timeline looks healthy ✨`
      : total === 0
      ? "Create your first task to get started ✨"
      : "Run AI suggestions in Predictive Timeline to get smart due date advice ✨";

  return (
    
    <div className="w-full px-1 sm:px-6 py-4">
      <div className="max-w-9xl mx-auto">
        
        {/* Bento Card */}
        <div className="bg-slate-900/80 dark:bg-slate-900 backdrop-blur-xl rounded-xl p-6 border border-white/5 shadow-lg relative overflow-hidden">

          {/* subtle glow */}
          <div className="absolute inset-0 bg-linear-to-br from-iris/10 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-glossy-gold mb-1">
                Active Intelligence
              </p>
              <h3 className="text-xl font-bold text-white">
                Predictive Accuracy
              </h3>
            </div>

            <BsRobot className="text-iris opacity-80" size={22} />
          </div>

          {/* Metric */}
          <div className="flex items-end gap-3 mb-4 relative z-10">
            <span className="text-5xl font-black tracking-tighter text-white">
              {message}
              
            </span>

          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative z-10">
            <div
              className="h-full bg-iris rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              style={{ width: `${message}` }}
            />
          </div>

          {/* Description */}
          <p className="mt-4 text-[11px] text-gray-400 leading-relaxed relative z-10">
            AI confidence is high based on recent task completion trends and current workload distribution.
          </p>
        </div>
      </div>
    </div>
  );
  
}

