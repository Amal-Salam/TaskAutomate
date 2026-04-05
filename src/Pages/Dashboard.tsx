/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api.js";
import CreateTaskModal from "../Components/CreateTaskModal.js";
import EditTaskModal from "../Components/EditTaskModal.js";
import PredictiveTimeline from "../Components/PredictiveTimeline.js";
import {
  FiPlus, FiUser, FiUsers, FiCheck, FiX,
  FiAlertTriangle, FiTrendingUp, FiZap,
  FiChevronRight, FiCalendar, FiClock,
} from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props { workspaceId: string; }

export default function Dashboard({ workspaceId }: Props) {
  const navigate = useNavigate();
  const [showCreate, setShowCreate]   = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const tasks    = useQuery(api.tasks.list,             { workspaceId: workspaceId as any });
  const myUserId = useQuery(api.tasks.getMyUserId);
  const members  = useQuery(api.workspaces.listMembers, { workspaceId: workspaceId as any });
  const acceptAI  = useMutation(api.tasks.acceptAISuggestion);
  const overrideAI = useMutation(api.tasks.overrideAISuggestion);

  const myMember = (members ?? []).find(m => m.userId === myUserId?.toString());
  const isAdmin  = myMember?.role === "admin";

  const allTasks = tasks ?? [];
  const myTasks  = allTasks.filter(t =>
    myTasksOnly && myUserId ? t.assigneeId?.toString() === myUserId : true
  );

  const done    = allTasks.filter(t => t.status === "done").length;
  const total   = allTasks.length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const aiCov   = total > 0 ? Math.round((allTasks.filter(t => t.iddSuggested || t.dueDate).length / total) * 100) : 0;
  const pending = allTasks.filter(t => t.iddSuggested);
  const atRisk  = allTasks.filter(t => t.iddSuggested && t.dueDate && t.iddSuggested < t.dueDate && t.status !== "done");

  const getMemberName = (id?: string) =>
    id ? (members ?? []).find(m => m.userId === id)?.name ?? "Unassigned" : "Unassigned";

  const handleAccept   = async (id: string) => { try { await acceptAI({ taskId: id as any }); } catch(e) { console.error(e); } };
  const handleOverride = async (id: string, d?: number) => { try { await overrideAI({ taskId: id as any, manualDate: d }); } catch(e) { console.error(e); } };

  // Recent tasks for the activity-style list
  const recentTasks = [...allTasks]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const activeTasks = allTasks.filter(t => t.status === "doing").slice(0, 4);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mt-0.5">
            {total} tasks · {members?.length ?? 0} members
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMyTasksOnly(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              myTasksOnly
                ? "bg-[#766ED5] text-white"
                : "bg-white dark:bg-[#1C1F2A] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-[#C6C5D4] hover:bg-gray-50 dark:hover:bg-[#262A35]"
            }`}
          >
            {myTasksOnly ? <FiUser size={13}/> : <FiUsers size={13}/>}
            {myTasksOnly ? "My Tasks" : "All Tasks"}
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg hover:scale-[0.97] transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
            >
              <FiPlus size={14}/> New Task
            </button>
          )}
        </div>
      </div>

      {/* ── Bento: stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion */}
        <div className="col-span-1 bg-white dark:bg-[#1C1F2A] rounded-xl p-5 border border-gray-100 dark:border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5] mb-1">Completion</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{pct}<span className="text-xl text-gray-300 dark:text-[#454652]">%</span></span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-[#0A0E18] rounded-full overflow-hidden">
            <div className="h-full bg-[#766ED5] rounded-full transition-all duration-700" style={{ width: `${pct}%` }}/>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-[#8f909d]">{done}/{total} tasks done</p>
        </div>

        {/* AI coverage */}
        <div className="col-span-1 bg-white dark:bg-[#1C1F2A] rounded-xl p-5 border border-gray-100 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-20">
            <BsRobot size={24} className="text-[#E9C349]"/>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#E9C349] mb-1">AI Coverage</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">{aiCov}<span className="text-xl text-gray-300 dark:text-[#454652]">%</span></span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-[#0A0E18] rounded-full overflow-hidden">
            <div className="h-full bg-[#E9C349] rounded-full transition-all duration-700" style={{ width: `${aiCov}%` }}/>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-[#8f909d]">tasks with AI dates</p>
        </div>

        {/* Task queue mini */}
        <div className="col-span-1 bg-white dark:bg-[#1C1F2A] rounded-xl p-5 border border-gray-100 dark:border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-3">Task Queue</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Backlog",  v: allTasks.filter(t => t.status === "todo").length,  c: "text-[#766ED5]" },
              { label: "Active",   v: allTasks.filter(t => t.status === "doing").length, c: "text-[#E9C349]" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 dark:bg-[#0A0E18] rounded-lg p-2.5">
                <p className="text-[9px] font-black uppercase text-gray-400 dark:text-[#8f909d]">{s.label}</p>
                <p className={`text-2xl font-black ${s.c}`}>{String(s.v).padStart(2, "0")}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/Kanban-board")}
            className="mt-3 w-full text-[10px] font-black uppercase tracking-widest text-[#766ED5] hover:text-[#766ED5]/80 flex items-center justify-center gap-1 transition-colors"
          >
            View Full Queue <FiChevronRight size={11}/>
          </button>
        </div>

        {/* Alert card */}
        <div className={`col-span-1 rounded-xl p-5 border flex flex-col justify-between ${
          atRisk.length > 0
            ? "border-[#900039]/30"
            : "bg-white dark:bg-[#1C1F2A] border-gray-100 dark:border-white/5"
        }`}
          style={atRisk.length > 0 ? { background: "linear-gradient(135deg, #8e0038 0%, #660026 100%)" } : {}}
        >
          <div className="flex items-start gap-2">
            <FiAlertTriangle size={14} className={atRisk.length > 0 ? "text-[#FFB2BE] mt-0.5" : "text-gray-400 dark:text-[#8f909d] mt-0.5"}/>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${atRisk.length > 0 ? "text-[#FFB2BE]/60" : "text-gray-400 dark:text-[#8f909d]"}`}>
                Alerts
              </p>
              <p className={`text-lg font-black mt-0.5 ${atRisk.length > 0 ? "text-white" : "text-gray-900 dark:text-white"}`}>
                {atRisk.length > 0 ? `${atRisk.length} at risk` : "All clear"}
              </p>
              <p className={`text-[10px] mt-1 ${atRisk.length > 0 ? "text-[#FFB2BE]/60" : "text-gray-400 dark:text-[#8f909d]"}`}>
                {atRisk.length > 0 ? "Review AI suggestions" : "No overdue tasks"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI suggestions review ──────────────────────────────── */}
      {pending.length > 0 && (
        <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-[#766ED5]/20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <FiZap size={13} className="text-[#766ED5]"/>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#766ED5]">
                AI Date Suggestions — {pending.length} pending
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {pending.map(task => (
              <div key={task._id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#8f909d] mt-0.5">
                    AI suggests <span className="text-[#766ED5] font-semibold">
                      {new Date(task.iddSuggested!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {task.aiReason && <span> — {task.aiReason}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleAccept(task._id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wide rounded-lg hover:bg-emerald-600 transition-all active:scale-95">
                    <FiCheck size={11}/> Accept
                  </button>
                  <button onClick={() => handleOverride(task._id, task.dueDate)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-[#0A0E18] text-gray-600 dark:text-[#C6C5D4] text-[10px] font-black uppercase tracking-wide rounded-lg hover:bg-gray-200 dark:hover:bg-[#262A35] transition-all active:scale-95">
                    <FiX size={11}/> Keep mine
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main matrix: active tasks + live ops ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Active tasks — project health matrix style */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white">Active Tasks</h2>
              <p className="text-[10px] text-gray-400 dark:text-[#8f909d]">In-progress items across your workspace</p>
            </div>
            <button
              onClick={() => navigate("/Kanban-board")}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#766ED5] hover:text-[#766ED5]/80 transition-colors"
            >
              Full Board <FiChevronRight size={11}/>
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {activeTasks.length === 0 && (
              <div className="flex items-center justify-center py-12 text-gray-300 dark:text-[#454652] text-xs">
                No tasks in progress
              </div>
            )}
            {activeTasks.map(task => {
              const dueTs = task.iddSuggested ?? task.dueDate;
              const overdue = dueTs && dueTs < Date.now();
              return (
                <div
                  key={task._id}
                  onClick={() => isAdmin && setEditingTask({ ...task, assigneeId: task.assigneeId?.toString() })}
                  className={`group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-all duration-200 ${isAdmin ? "cursor-pointer" : ""}`}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#766ED5]/10 border border-[#766ED5]/20 flex items-center justify-center shrink-0">
                    <BsRobot size={16} className="text-[#766ED5]"/>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-400 dark:text-[#8f909d] uppercase tracking-wide">
                        {getMemberName(task.assigneeId?.toString())}
                      </span>
                      {dueTs && (
                        <>
                          <span className="text-gray-200 dark:text-[#454652]">·</span>
                          <span className={`text-[10px] uppercase tracking-wide flex items-center gap-1 ${overdue ? "text-[#FFB2BE]" : "text-gray-400 dark:text-[#8f909d]"}`}>
                            {task.iddSuggested ? <BsRobot size={9}/> : <FiCalendar size={9}/>}
                            {new Date(dueTs).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Story points + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    {task.storyPoints && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#766ED5]/10 text-[#766ED5]">
                        {task.storyPoints}pt
                      </span>
                    )}
                    <FiChevronRight size={14} className="text-gray-300 dark:text-[#454652] group-hover:text-[#766ED5] transition-colors"/>
                  </div>
                </div>
              );
            })}
          </div>
          {allTasks.filter(t => t.status === "doing").length > 4 && (
            <div className="px-6 py-3 border-t border-gray-100 dark:border-white/5">
              <button
                onClick={() => navigate("/Kanban")}
                className="text-[10px] font-black uppercase tracking-widest text-[#766ED5] hover:text-[#766ED5]/80 flex items-center gap-1 transition-colors"
              >
                +{allTasks.filter(t => t.status === "doing").length - 4} more tasks <FiChevronRight size={11}/>
              </button>
            </div>
          )}
        </div>

        {/* Task queue mini panel */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">Queue Summary</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#0A0E18] text-[#766ED5] uppercase">
              Active: {total}
            </span>
          </div>
          <div className="p-5 space-y-4">
            {/* Circular throughput indicator */}
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#0A0E18" strokeWidth="4"/>
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#766ED5" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.7s ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black italic text-gray-900 dark:text-white">{pct}%</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d]">Queue Throughput</p>
                <p className="text-[11px] text-gray-500 dark:text-[#8f909d]">{done} completed of {total}</p>
              </div>
            </div>

            {/* Status grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Backlog",  v: allTasks.filter(t => t.status === "todo").length,  c: "text-[#766ED5]" },
                { label: "Active",   v: allTasks.filter(t => t.status === "doing").length, c: "text-[#E9C349]" },
                { label: "Review",   v: pending.length,                                     c: "text-[#FFB2BE]" },
                { label: "Complete", v: done,                                               c: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-[#0A0E18] p-3 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.c}`}>{String(s.v).padStart(2, "0")}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/Kanban-board")}
              className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-[#C6C5D4] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-colors"
            >
              View Full Queue
            </button>
          </div>
        </div>
      </div>

      {/* ── Predictive Timeline (collapsible) ───────────────────── */}
      <div className="bg-white dark:bg-[#1C1F2A] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <button
          onClick={() => setShowTimeline(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#262A35] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FiClock size={14} className="text-[#766ED5]"/>
            <span className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-white">Predictive Timeline</span>
            <span className="text-[10px] px-2 py-0.5 bg-[#766ED5]/10 text-[#766ED5] rounded font-black uppercase">AI</span>
          </div>
          <FiChevronRight size={16} className={`text-gray-400 transition-transform duration-200 ${showTimeline ? "rotate-90" : ""}`}/>
        </button>
        {showTimeline && (
          <div className="border-t border-gray-100 dark:border-white/5 p-5">
            <PredictiveTimeline workspaceId={workspaceId}/>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateTaskModal workspaceId={workspaceId} onClose={() => setShowCreate(false)}/>}
      {editingTask && <EditTaskModal task={editingTask} workspaceId={workspaceId} onClose={() => setEditingTask(null)}/>}
    </div>
  );
}