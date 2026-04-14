/* eslint-disable prettier/prettier */
import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import CreateTaskModal from '../Components/CreateTaskModal.js';
import EditTaskModal from '../Components/EditTaskModal.js';
import { FiPlus, FiSearch, FiX, FiCalendar, FiZap } from 'react-icons/fi';
import { BsRobot } from 'react-icons/bs';

interface Props {
  workspaceId: string;
}

const COLUMNS = [
  {
    key: 'todo',
    label: 'To Do',
    accent: '#766ED5',
    bg: 'bg-[#766ED5]/10',
    text: 'text-[#766ED5]',
    border: 'border-l-[#766ED5]',
  },
  {
    key: 'doing',
    label: 'In Progress',
    accent: '#E9C349',
    bg: 'bg-[#E9C349]/10',
    text: 'text-[#E9C349]',
    border: 'border-l-[#E9C349]',
  },
  {
    key: 'done',
    label: 'Done',
    accent: '#4ade80',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-l-emerald-500',
  },
] as const;

// ── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-4 space-y-3 border border-white/5 animate-pulse"
      style={{ background: 'rgba(21,27,45,0.5)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-12 rounded-full bg-white/10" />
        <div className="h-3 w-3 rounded bg-white/10" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-3/4 rounded bg-white/10" />
        <div className="h-3.5 w-1/2 rounded bg-white/10" />
      </div>
      <div className="h-3 w-full rounded bg-white/5" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
        <div className="h-3 w-10 rounded bg-white/10" />
      </div>
    </div>
  );
}

// ── Column skeleton ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SkeletonColumn({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  label,
  count = 3,
}: {
  label: string;
  count?: number;
}) {
  return (
    <div
      className="rounded-2xl p-4 border border-white/5 space-y-3"
      style={{ background: 'rgba(15,19,29,0.6)' }}
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-6 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ── Empty column state ─────────────────────────────────────────────────────
function EmptyColumn({
  col,
  dragOver,
  isAdmin,
  onAddTask,
}: {
  col: (typeof COLUMNS)[number];
  dragOver: boolean;
  isAdmin: boolean;
  onAddTask: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed transition-all duration-200 ${
        dragOver
          ? 'border-[#766ED5]/60 bg-[#766ED5]/5 scale-[1.01]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {dragOver ? (
        <>
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#766ED5]/60 flex items-center justify-center">
            <FiPlus size={16} className="text-[#766ED5]" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-[#766ED5]">
            Drop here
          </p>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
            <span className="text-sm" style={{ color: col.accent }}>
              ○
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-500 dark:text-[#454652]">
              No {col.label.toLowerCase()} tasks
            </p>
            {col.key === 'todo' && isAdmin && (
              <button
                onClick={onAddTask}
                className="mt-1.5 text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition"
                style={{ color: col.accent }}
              >
                + Add first task
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TaskQueue({ workspaceId }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [refining, setRefining] = useState<string | null>(null);

  const tasks = useQuery(api.tasks.list, { workspaceId: workspaceId as any });
  const myUserId = useQuery(api.tasks.getMyUserId);
  const members = useQuery(api.workspaces.listMembers, {
    workspaceId: workspaceId as any,
  });
  const updateTask = useMutation(api.tasks.update);
  const generateDesc = useAction(api.ai.generateTaskDescription);

  const isLoading =
    tasks === undefined || members === undefined || myUserId === undefined;

  const myMember = (members ?? []).find(
    (m) => m.userId === myUserId?.toString(),
  );
  const isAdmin = myMember?.role === 'admin';

  // ── Permission helpers ──────────────────────────────────────────────────
  // A user can interact with a task if they are admin OR it's assigned to them
  const canInteract = (task: any): boolean => {
    if (isAdmin) return true;
    return task.assigneeId?.toString() === myUserId;
  };

  const getMemberName = (id?: string) =>
    id
      ? ((members ?? []).find((m) => m.userId === id)?.name ?? 'Unassigned')
      : 'Unassigned';

  const filtered = (tasks ?? []).filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  );

  const byStatus = (s: string) => filtered.filter((t) => t.status === s);

  // ── Drag & drop ─────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragging(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(col);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging) return;
    const task = (tasks ?? []).find((t) => t._id === dragging);
    if (!task || task.status === newStatus) {
      setDragging(null);
      return;
    }

    // Double-check permission on drop (belt and braces)
    if (!canInteract(task)) {
      setDragging(null);
      return;
    }

    try {
      await updateTask({
        taskId: task._id as any,
        title: task.title,
        description: task.description,
        status: newStatus as any,
        assigneeId: task.assigneeId as any,
        dueDate: task.dueDate,
        storyPoints: task.storyPoints,
        inventoryItems: task.inventoryItems,
        inventoryBlocked: task.inventoryBlocked,
      });
    } catch (e) {
      console.error(e);
    }
    setDragging(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  // ── AI refine description ────────────────────────────────────────────────
  const handleRefine = async (task: any) => {
    if (!canInteract(task)) return;
    setRefining(task._id);
    try {
      const result = await generateDesc({
        title: task.title,
        workspaceId: workspaceId as any,
      });
      await updateTask({
        taskId: task._id as any,
        title: task.title,
        description: result.description,
        status: task.status,
        assigneeId: task.assigneeId as any,
        dueDate: task.dueDate,
        storyPoints: result.storyPoints ?? task.storyPoints,
        inventoryItems: task.inventoryItems,
        inventoryBlocked: task.inventoryBlocked,
      });
    } catch (e) {
      console.error(e);
    }
    setRefining(null);
  };

  const atRisk = (tasks ?? []).filter(
    (t) =>
      t.iddSuggested &&
      t.dueDate &&
      t.iddSuggested < t.dueDate &&
      t.status !== 'done',
  );

  // ── Loading state — show skeleton board ─────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 min-h-screen">
        {/* Action bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-9 w-36 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-9 w-48 rounded-full bg-white/5 animate-pulse" />
        </div>
        {/* Board skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <SkeletonColumn label="To Do" count={3} />
          <SkeletonColumn label="In Progress" count={2} />
          <SkeletonColumn label="Done" count={1} />
        </div>
      </div>
    );
  }

  // ── Empty workspace — zero tasks at all ─────────────────────────────────
  const hasNoTasks = (tasks ?? []).length === 0;

  return (
    <div className="space-y-6 pb-8 min-h-screen">
      {/* ── AI Insights Panel ──────────────────────────────────────── */}
      {atRisk.length > 0 && (
        <section
          className="relative overflow-hidden rounded-xl border border-white/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: 'rgba(21,27,45,0.7)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(45deg, transparent, rgba(255,255,255,0.03), transparent)',
              transform: 'rotate(45deg)',
            }}
          />
          <div className="relative flex items-start gap-4">
            <div
              className="p-2.5 rounded-xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, #FFE088 0%, #E9C349 100%)',
              }}
            >
              <BsRobot size={18} className="text-[#241A00]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white">
                Queue Optimisation Analysis
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#C6C5D4] mt-1 max-w-xl">
                AI has detected {atRisk.length} task
                {atRisk.length > 1 ? 's' : ''} at risk of slipping their
                deadlines.
              </p>
            </div>
          </div>
          <button className="relative shrink-0 px-4 py-2 bg-white/5 border border-[#E9C349]/20 text-[#E9C349] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#E9C349]/10 transition-all">
            View Analysis
          </button>
        </section>
      )}
      {/* ── Action bar ──────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg hover:scale-[0.97] transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)',
              }}
            >
              <FiPlus size={14} /> Create New Task
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#171B26] px-4 py-2 rounded-full border border-gray-200 dark:border-white/5 w-full sm:w-auto">
          <FiSearch
            size={14}
            className="text-gray-400 dark:text-[#8f909d] shrink-0"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#454652] w-full sm:w-48"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <FiX size={13} />
            </button>
          )}
        </div>
      </section>
      {/* ── Empty workspace state ────────────────────────────────────── */}
      {hasNoTasks && !search && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(118,110,213,0.1)',
              border: '1px solid rgba(118,110,213,0.2)',
            }}
          >
            <BsRobot size={28} style={{ color: '#766ED5' }} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              No tasks yet
            </h3>
            <p className="text-sm text-gray-400 dark:text-[#8f909d] max-w-sm">
              {isAdmin
                ? 'Create your first task to get started. The AI will help suggest due dates and descriptions.'
                : 'No tasks have been assigned to this workspace yet.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition"
              style={{
                background: 'linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)',
              }}
            >
              <FiPlus size={14} /> Create First Task
            </button>
          )}
        </div>
      )}
      {/* ── Kanban board ─────────────────────────────────────────────── */}
      {(!hasNoTasks || search) && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
              onDragLeave={() => setDragOver(null)}
              className={`rounded-2xl p-4 border transition-all duration-200 ${
                dragOver === col.key
                  ? 'border-[#766ED5]/40 bg-[#766ED5]/5'
                  : 'border-white/5'
              }`}
              style={{
                background:
                  dragOver === col.key ? undefined : 'rgba(15,19,29,0.6)',
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-1 pb-3 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${col.text}`}
                  >
                    {col.label}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${col.bg} ${col.text}`}
                  >
                    {byStatus(col.key).length}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-gray-400 dark:text-[#454652] hover:text-[#766ED5] transition-colors p-0.5"
                  >
                    <FiPlus size={15} />
                  </button>
                )}
              </div>

              {/* Task cards */}
              <div className="space-y-3 min-h-16">
                {byStatus(col.key).length === 0 ? (
                  <EmptyColumn
                    col={col}
                    dragOver={dragOver === col.key}
                    isAdmin={isAdmin}
                    onAddTask={() => setShowCreate(true)}
                  />
                ) : (
                  byStatus(col.key).map((task) => {
                    const isDraggingThis = dragging === task._id;
                    const dueTs = task.iddSuggested ?? task.dueDate;
                    const overdue =
                      dueTs && dueTs < Date.now() && task.status !== 'done';
                    const canDo = canInteract(task);

                    return (
                      <div
                        key={task._id}
                        draggable={canDo}
                        onDragStart={(e) =>
                          canDo && handleDragStart(e, task._id)
                        }
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (isDraggingThis) return;

                          const isUserAdmin = isAdmin;
                          const isAssigned =
                            task.assigneeId?.toString() === myUserId;

                          if (isUserAdmin || isAssigned) {
                            setEditingTask({
                              ...task,
                              assigneeId: task.assigneeId?.toString(),
                              readOnly: !isUserAdmin,
                            });
                          }
                        }}
                        // onClick={() => !isDraggingThis && canDo && setEditingTask({ ...task, assigneeId: task.assigneeId?.toString() })}
                        className={`relative rounded-xl p-4 space-y-3 border transition-all duration-200 select-none ${
                          col.key === 'done'
                            ? 'opacity-60 border-white/5'
                            : 'border-white/5 hover:border-l-[#766ED5]/60'
                        } ${col.key === 'doing' ? `border-l-4 ${col.border}` : ''} ${
                          isDraggingThis ? 'opacity-40 scale-95 rotate-1' : ''
                        } ${canDo ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                        style={{
                          background: 'rgba(21,27,45,0.5)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        {/* Tag row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {task.storyPoints && (
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${col.bg} ${col.text}`}
                              >
                                {task.storyPoints}pt
                              </span>
                            )}
                            {overdue && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide bg-[#8e0038]/30 text-[#FFB2BE]">
                                Overdue
                              </span>
                            )}
                            {task.inventoryBlocked && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide bg-[#FFB2BE]/10 text-[#FFB2BE]">
                                ⚠ Parts
                              </span>
                            )}
                            {col.key === 'done' && (
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                ✓ Completed
                              </span>
                            )}
                          </div>
                          {canDo && (
                            <span className="text-gray-500 dark:text-[#454652] shrink-0 text-sm">
                              ⠿
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3
                          className={`text-sm font-bold leading-snug ${
                            col.key === 'done'
                              ? 'line-through text-gray-500 dark:text-[#8f909d]'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {/* Description */}
                        <p className="text-[11px] text-gray-400 dark:text-[#8f909d] line-clamp-2">
                          {task.description}
                        </p>

                        {/* Progress bar for in-progress */}
                        {col.key === 'doing' && task.storyPoints && (
                          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-[#766ED5] w-1/2 rounded-full" />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-app-indigo flex items-center justify-center text-[9px] font-black text-white shrink-0">
                              {getMemberName(
                                task.assigneeId?.toString(),
                              )[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-[#8f909d] truncate">
                              {getMemberName(task.assigneeId?.toString())}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {dueTs && (
                              <span
                                className={`flex items-center gap-1 text-[10px] font-semibold ${
                                  overdue
                                    ? 'text-[#FFB2BE]'
                                    : task.iddSuggested
                                      ? 'text-[#766ED5]'
                                      : 'text-gray-400 dark:text-[#8f909d]'
                                }`}
                              >
                                {task.iddSuggested ? (
                                  <BsRobot size={9} />
                                ) : (
                                  <FiCalendar size={9} />
                                )}
                                {new Date(dueTs).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            )}
                            {/* AI Refine — available to assignee or admin */}
                            {canDo && col.key !== 'done' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRefine(task);
                                }}
                                disabled={refining === task._id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                                style={{
                                  background:
                                    'linear-gradient(135deg, #C6C5D4 0%, #8F909D 100%)',
                                  color: '#0F131D',
                                }}
                              >
                                <FiZap size={9} />
                                {refining === task._id ? '...' : 'Refine'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </section>
      )}
      {/* ── Floating velocity panel ──────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-30 hidden lg:block">
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-xl border border-white/10 shadow-2xl"
          style={{
            background: 'rgba(44,60,153,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#766ED5]">
              Completion
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white">
              {(tasks ?? []).length > 0
                ? Math.round(
                    ((tasks ?? []).filter((t) => t.status === 'done').length /
                      (tasks ?? []).length) *
                      100,
                  )
                : 0}
              %
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#E9C349]">
              At Risk
            </p>
            <p className="text-xl font-black text-[#E9C349] italic">
              {atRisk.length > 0 ? atRisk.length : '—'}
            </p>
          </div>
        </div>
      </div>
      {/* Modals */}
      {showCreate && (
        <CreateTaskModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          workspaceId={workspaceId}
          readOnly={editingTask.readOnly}
          onClose={() => setEditingTask(null)}
        />
      )}
       
    </div>
  );
}
