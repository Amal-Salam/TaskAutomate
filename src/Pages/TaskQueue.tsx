/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import CreateTaskModal from "../Components/CreateTaskModal.js";
import EditTaskModal from "../Components/EditTaskModal.js";
import { FiPlus, FiSearch, FiX, FiCalendar, FiZap } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props { workspaceId: string; }

const COLUMNS = [
  { key: "todo",  label: "To Do",       accent: "#766ED5", bg: "bg-[#766ED5]/10", text: "text-[#766ED5]",  border: "border-l-[#766ED5]" },
  { key: "doing", label: "In Progress", accent: "#E9C349", bg: "bg-[#E9C349]/10", text: "text-[#E9C349]",  border: "border-l-[#E9C349]" },
  { key: "done",  label: "Done",        accent: "#4ade80", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-l-emerald-500" },
] as const;

export default function TaskQueue({ workspaceId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [search, setSearch]   = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver]  = useState<string | null>(null);

  const tasks    = useQuery(api.tasks.list, { workspaceId: workspaceId as any });
  const myUserId = useQuery(api.tasks.getMyUserId);
  const members  = useQuery(api.workspaces.listMembers, { workspaceId: workspaceId as any });
  const updateTask    = useMutation(api.tasks.update);
  const generateDesc  = useAction(api.ai.generateTaskDescription);

  const myMember = (members ?? []).find(m => m.userId === myUserId?.toString());
  const isAdmin  = myMember?.role === "admin";

  const getMemberName = (id?: string) =>
    id ? (members ?? []).find(m => m.userId === id)?.name ?? "Unassigned" : "Unassigned";

  const filtered = (tasks ?? []).filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (s: string) => filtered.filter(t => t.status === s);

  // ── Drag & drop ────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragging(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(col);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging) return;
    const task = (tasks ?? []).find(t => t._id === dragging);
    if (!task || task.status === newStatus) { setDragging(null); return; }
    try {
      await updateTask({
        taskId: task._id as any,
        title: task.title,
        description: task.description,
        status: newStatus as any,
        assigneeId: task.assigneeId as any,
        dueDate: task.dueDate,
        storyPoints: task.storyPoints,
      });
    } catch(e) { console.error(e); }
    setDragging(null);
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  // ── AI regenerate description inline ───────────────────────────
  const [refining, setRefining] = useState<string | null>(null);
  const handleRefine = async (task: any) => {
    setRefining(task._id);
    try {
      const result = await generateDesc({ title: task.title, workspaceId: workspaceId as any });
      await updateTask({
        taskId: task._id as any,
        title: task.title,
        description: result.description,
        status: task.status,
        assigneeId: task.assigneeId as any,
        dueDate: task.dueDate,
        storyPoints: result.storyPoints ?? task.storyPoints,
      });
    } catch(e) { console.error(e); }
    setRefining(null);
  };

  const atRisk = (tasks ?? []).filter(
    t => t.iddSuggested && t.dueDate && t.iddSuggested < t.dueDate && t.status !== "done"
  );

  return (
    <div className="space-y-6 pb-8 min-h-screen">

      {/* ── AI Insights Panel ──────────────────────────────────── */}
      {atRisk.length > 0 && (
        <section className="relative overflow-hidden rounded-xl border border-white/5 dark:border-white/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "rgba(21,27,45,0.7)", backdropFilter: "blur(12px)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(45deg, transparent, rgba(255,255,255,0.03), transparent)", transform: "rotate(45deg)" }}/>
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg, #FFE088 0%, #E9C349 100%)" }}>
              <BsRobot size={18} className="text-[#241A00]"/>
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white">Queue Optimization Analysis</h2>
              <p className="text-xs text-gray-500 dark:text-[#C6C5D4] mt-1 max-w-xl">
                AI has detected {atRisk.length} task{atRisk.length > 1 ? "s" : ""} at risk of slipping their deadlines. Review the Predictive Timeline for recommended adjustments.
              </p>
            </div>
          </div>
          <button className="relative shrink-0 px-4 py-2 bg-white/5 dark:bg-white/5 border border-[#E9C349]/20 text-[#E9C349] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#E9C349]/10 transition-all">
            View Analysis
          </button>
        </section>
      )}

      {/* ── Action bar ─────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg hover:scale-[0.97] transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
            >
              <FiPlus size={14}/> Create New Task
            </button>
          )}
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#171B26] px-4 py-2 rounded-full border border-gray-200 dark:border-white/5 w-full sm:w-auto">
          <FiSearch size={14} className="text-gray-400 dark:text-[#8f909d] shrink-0"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#454652] w-full sm:w-48"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
              <FiX size={13}/>
            </button>
          )}
        </div>
      </section>

      {/* ── Kanban board ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {COLUMNS.map(col => (
          <div
            key={col.key}
            onDragOver={e => handleDragOver(e, col.key)}
            onDrop={e => handleDrop(e, col.key)}
            onDragLeave={() => setDragOver(null)}
            className={`space-y-3 rounded-xl transition-all duration-200 p-1 ${
              dragOver === col.key ? "bg-white/5 dark:bg-white/5 ring-2 ring-inset ring-[#766ED5]/30" : ""
            }`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black uppercase tracking-widest ${col.text}`}>
                  {col.label}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.bg} ${col.text}`}>
                  {byStatus(col.key).length}
                </span>
              </div>
              {isAdmin && col.key === "todo" && (
                <button onClick={() => setShowCreate(true)} className="text-gray-400 dark:text-[#454652] hover:text-[#766ED5] transition-colors">
                  <FiPlus size={15}/>
                </button>
              )}
            </div>

            {/* Task cards */}
            <div className="space-y-3 min-h-16">
              {byStatus(col.key).map(task => {
                const isDraggingThis = dragging === task._id;
                const dueTs   = task.iddSuggested ?? task.dueDate;
                const overdue = dueTs && dueTs < Date.now() && task.status !== "done";

                return (
                  <div
                    key={task._id}
                    draggable={isAdmin}
                    onDragStart={e => handleDragStart(e, task._id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => !isDraggingThis && isAdmin && setEditingTask({ ...task, assigneeId: task.assigneeId?.toString() })}
                    className={`relative rounded-xl p-4 space-y-3 border transition-all duration-200 select-none ${
                      col.key === "done"
                        ? "opacity-60 grayscale-20 border-white/5 dark:border-white/5"
                        : "border-white/5 dark:border-white/5 hover:border-l-[#766ED5]/60"
                    } ${col.key === "doing" ? `border-l-4 ${col.border}` : ""} ${
                      isDraggingThis ? "opacity-40 scale-95 rotate-1" : ""
                    } ${isAdmin ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                    style={{ background: "rgba(21,27,45,0.5)", backdropFilter: "blur(12px)" }}
                  >
                    {/* Tag + drag indicator */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.storyPoints && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${col.bg} ${col.text}`}>
                            {task.storyPoints}pt
                          </span>
                        )}
                        {overdue && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide bg-[#8e0038]/30 text-[#FFB2BE]">
                            Overdue
                          </span>
                        )}
                        {col.key === "done" && (
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">✓ Completed</span>
                        )}
                      </div>
                      {isAdmin && (
                        <span className="text-gray-500 dark:text-[#454652] shrink-0 text-sm">⠿</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-sm font-bold leading-snug ${
                      col.key === "done"
                        ? "line-through text-gray-500 dark:text-[#8f909d]"
                        : "text-gray-900 dark:text-white"
                    }`}>
                      {task.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[11px] text-gray-400 dark:text-[#8f909d] line-clamp-2">
                      {task.description}
                    </p>

                    {/* Progress bar for in-progress tasks */}
                    {col.key === "doing" && task.storyPoints && (
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-[#766ED5] w-1/2 rounded-full"/>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Assignee avatar */}
                        <div className="w-5 h-5 rounded-full bg-app-indigo flex items-center justify-center text-[9px] font-black text-white shrink-0">
                          {getMemberName(task.assigneeId?.toString())[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-[#8f909d] truncate">
                          {getMemberName(task.assigneeId?.toString())}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Due date */}
                        {dueTs && (
                          <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                            overdue ? "text-[#FFB2BE]" : task.iddSuggested ? "text-[#766ED5]" : "text-gray-400 dark:text-[#8f909d]"
                          }`}>
                            {task.iddSuggested ? <BsRobot size={9}/> : <FiCalendar size={9}/>}
                            {new Date(dueTs).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}

                        {/* AI Refine button */}
                        {isAdmin && col.key !== "done" && (
                          <button
                            onClick={e => { e.stopPropagation(); handleRefine(task); }}
                            disabled={refining === task._id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg, #C6C5D4 0%, #8F909D 100%)", color: "#0F131D" }}
                          >
                            <FiZap size={9}/>
                            {refining === task._id ? "..." : "Refine"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty column drop zone */}
              {byStatus(col.key).length === 0 && (
                <div className={`flex items-center justify-center h-24 rounded-xl border-2 border-dashed transition-colors ${
                  dragOver === col.key
                    ? "border-[#766ED5]/50 bg-[#766ED5]/5"
                    : "border-gray-200 dark:border-white/5"
                }`}>
                  <p className="text-[11px] text-gray-300 dark:text-[#454652]">
                    {dragOver === col.key ? "Drop here" : search ? "No matches" : "No tasks"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── Floating velocity panel ─────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-30 hidden lg:block">
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-xl border border-white/10 shadow-2xl"
          style={{ background: "rgba(44,60,153,0.2)", backdropFilter: "blur(12px)" }}
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#766ED5]">Completion</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">
              {(tasks ?? []).length > 0
                ? Math.round(((tasks ?? []).filter(t => t.status === "done").length / (tasks ?? []).length) * 100)
                : 0}%
            </p>
          </div>
          <div className="h-8 w-px bg-white/10"/>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#E9C349]">At Risk</p>
            <p className="text-xl font-black text-[#E9C349] italic">{atRisk.length > 0 ? atRisk.length : "—"}</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateTaskModal workspaceId={workspaceId} onClose={() => setShowCreate(false)}/>}
      {editingTask && <EditTaskModal task={editingTask} workspaceId={workspaceId} onClose={() => setEditingTask(null)}/>}
    </div>
  );
}