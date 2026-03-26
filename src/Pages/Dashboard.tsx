/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import TaskCard from "../Components/Taskcard.js";
import CreateTaskModal from "../Components/CreateTaskModal.js";
import EditTaskModal from "../Components/EditTaskModal.js";
import PredictiveTimeline from "../Components/PredictiveTimeline.js"
import { FiPlus, FiUser, FiUsers, FiCheck, FiX} from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props {
  workspaceId: string;
}

const STATUS_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "doing", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

export default function Dashboard({ workspaceId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const tasks = useQuery(api.tasks.list, { workspaceId: workspaceId as any });
  const myUserId = useQuery(api.tasks.getMyUserId);
  const acceptAI = useMutation(api.tasks.acceptAISuggestion);
  const overrideAI = useMutation(api.tasks.overrideAISuggestion);
  const members = useQuery(api.workspaces.listMembers, { workspaceId: workspaceId as any });
  const myMember = (members ?? []).find((m) => m.userId === myUserId?.toString());
  const isAdmin = myMember?.role === "admin";
//  console.log("myUserId:", myUserId, typeof myUserId);
//  console.log("task assigneeIds:", (tasks ?? []).map(t => ({ id: t._id, assigneeId: t.assigneeId, type: typeof t.assigneeId })));
  const visibleTasks = (tasks ?? []).filter((t) => {
     if (!myTasksOnly) return true;
     if (!myUserId) return false;
     return t.assigneeId?.toString() === myUserId;
  });

  const byStatus = (status: string) =>
    visibleTasks.filter((t) => t.status === status);

  const pendingAISuggestions = (tasks ?? []).filter((t) => t.iddSuggested);

  const handleAccept = async (taskId: string) => {
    try{
      await acceptAI({ taskId: taskId as any});
    } catch (e){ console.error(e);}
  };
  const handleOverride = async (taskId: string, existingDueDate?: number) => {
    try{
      await overrideAI({ taskId: taskId as any, manualDate: existingDueDate});
    } catch (e) {console.error(e)}
  };

  return (
    <div className="space-y-0">
      
      <div className="space-y-6 p-6">
        {/* Header */}
    
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-bold font-serif text-shimmer-gold">Dashboard</h1>
          <div className="flex items-center gap-2">
          {/* My Tasks toggle */}
          <button
            onClick={() => setMyTasksOnly((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              myTasksOnly
                ? "bg-glossy-silver text-white"
                : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {myTasksOnly ? <FiUser size={14} /> : <FiUsers size={14} />}
            {myTasksOnly ? "My Tasks" : "All Tasks"}
          </button>
          
          {isAdmin && ( 
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-glossy-gold animate-shimmer text-white rounded-lg text-sm font-semibold hover:bg-glossy-gold/80 transition"
          >
            <FiPlus size={16} />
            New Task
          </button>
          )}
        </div>
        </div>
  
         {/* AI Suggestions Review Panel — shows when there are pending suggestions */}
      {pendingAISuggestions.length > 0 && (
        <div className="rounded-xl border border-iris/20 bg-iris/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BsRobot size={16} className="text-iris" />
            <p className="text-sm font-semibold text-indigo dark:text-white">
              AI has suggested due dates for {pendingAISuggestions.length} task{pendingAISuggestions.length > 1 ? "s" : ""} — review and accept or override
            </p>
          </div>
 
          <div className="space-y-2">
            {pendingAISuggestions.map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg px-3 py-2.5 border border-iris/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-indigo dark:text-white truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    AI suggests:{" "}
                    <span className="text-iris font-medium">
                      {new Date(task.iddSuggested!).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    {task.aiReason && (
                      <span className="text-gray-400"> — {task.aiReason}</span>
                    )}
                  </p>
                </div>
 
                <div className="flex items-center gap-2 shrink-0">
                  {/* Accept */}
                  <button
                    onClick={() => handleAccept(task._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition"
                  >
                    <FiCheck size={12} /> Accept
                  </button>
                  {/* Override */}
                  <button
                    onClick={() => handleOverride(task._id, task.dueDate)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <FiX size={12} /> Keep mine
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
              {/* Kanban columns */}
        <div className="grid gap-6 sm:grid-cols-3">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {col.label}
                </h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full px-2 py-0.5">
                  {byStatus(col.key).length}
                </span>
              </div>

              {byStatus(col.key).length === 0 && (
                <div className="text-xs text-gray-400 italic px-1">No tasks yet</div>
              )}

              {byStatus(col.key).map((task) => (
                <TaskCard
                  key={task._id}
                  title={task.title}
                  desc={task.description}
                  due={
                    task.iddSuggested
                      ? new Date(task.iddSuggested).toISOString().split("T")[0]
                      : task.dueDate
                      ? new Date(task.dueDate).toISOString().split("T")[0]
                      : undefined
                  }
                  aiSuggested={!!task.iddSuggested}
                  storyPoints={task.storyPoints}
                  onClick={() => setEditingTask({
                    ...task,
                    assigneeId: task.assigneeId?.toString(),
                  })}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Predictive Timeline */}
        <PredictiveTimeline workspaceId={workspaceId} />
      </div>

      {/* Create task modal */}
      {showCreate && (
        <CreateTaskModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/*Edit task modal*/}
      {editingTask && (
        <EditTaskModal
            task={editingTask}
            workspaceId={workspaceId}
            onClose={() => setEditingTask(null)}
            />
      )}
    </div>
  );
}
