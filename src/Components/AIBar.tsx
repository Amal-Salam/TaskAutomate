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
    <div className="relative w-full h-12 bg-slate-950 backdrop-blur-xl from-iris/20 to-iris/10 dark:from-iris/30 dark:to-iris/20  border-b border-iris/30">
      
      <div className="mx-auto max-w-7xl flex items-center h-full px-4">
        <BsRobot className="text-iris mr-2 shrink-0" size={20} />
        <span className="text-sm sm:text-base font-medium text-indigo dark:text-iris animate-fade-in truncate">
          {message}
        </span>
      </div>
    </div>
  );
}

