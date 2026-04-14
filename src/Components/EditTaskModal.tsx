/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useAction, useMutation,useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiX, FiCalendar, FiZap, FiTrash2 ,FiUser,FiPackage, FiPlus, FiChevronDown, FiChevronUp, FiAlertTriangle,} from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

type InventoryStatus =
  | "available"
  | "low_stock"
  | "ordered"
  | "in_transit"
  | "not_available";
 
interface InventoryItem {
  name: string;
  status: InventoryStatus;
  quantity?: number;
  expectedDate?: string; // local date string for input
  notes?: string;
}
interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  dueDate?: number;
  storyPoints?: number;
  assigneeId?: string;
  iddSuggested?: number;
  aiReason?: string;
  inventoryItems?: Array<{
    name: string;
    status: string;
    quantity?: number;
    expectedDate?: number;
    notes?: string;
  }>;
  inventoryBlocked?: boolean;
}

interface Props {
  task: Task;
  workspaceId: string;
  readOnly: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "In Progress" },
  { value: "done", label: "Done" },
] as const;

const STORY_POINTS = [1, 2, 3, 5, 8, 13];

const INVENTORY_STATUS_OPTIONS: {
  value: InventoryStatus;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: "available",     label: "Available",     color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  { value: "low_stock",     label: "Low Stock",     color: "#E9C349", bg: "rgba(233,195,73,0.1)"  },
  { value: "ordered",       label: "Ordered",       color: "#766ED5", bg: "rgba(118,110,213,0.1)" },
  { value: "in_transit",    label: "In Transit",    color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  { value: "not_available", label: "Not Available", color: "#FFB2BE", bg: "rgba(255,178,190,0.1)" },
];
 
const EMPTY_ITEM: InventoryItem = {
  name: "", status: "available", quantity: undefined, expectedDate: "", notes: "",
};
 
// ── Inventory impact helper ───────────────────────────────────────────────────
function getInventoryImpact(items: InventoryItem[]): {
  blocked: boolean;
  warning: boolean;
  message: string | null;
} {
  const blocked = items.some(i => i.status === "not_available");
  const warning = !blocked && items.some(i =>
    i.status === "low_stock" || i.status === "ordered" || i.status === "in_transit"
  );
 
  if (blocked) {
    const names = items
      .filter(i => i.status === "not_available")
      .map(i => i.name || "Unnamed item");
    return {
      blocked: true, warning: false,
      message: `⚠ Timeline blocked — ${names.join(", ")} ${names.length === 1 ? "is" : "are"} not available. AI will flag this task for delay.`,
    };
  }
 
  if (warning) {
    const earliest = items
      .filter(i => i.status === "ordered" || i.status === "in_transit")
      .map(i => i.expectedDate)
      .filter(Boolean)
      .sort()[0];
    return {
      blocked: false, warning: true,
      message: earliest
        ? `AI will factor in pending items. Earliest expected arrival: ${new Date(earliest!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
        : "AI will account for pending inventory items when suggesting due dates.",
    };
  }
 
  return { blocked: false, warning: false, message: null };
}
 
// ── Convert stored timestamp items → local form state ────────────────────────
function hydrateInventoryItems(
  raw?: Task["inventoryItems"]
): InventoryItem[] {
  if (!raw || raw.length === 0) return [];
  return raw.map(i => ({
    name:         i.name,
    status:       i.status as InventoryStatus,
    quantity:     i.quantity,
    expectedDate: i.expectedDate
      ? new Date(i.expectedDate).toISOString().split("T")[0]
      : "",
    notes: i.notes ?? "",
  }));
}

export default function EditTaskModal({ task, workspaceId, onClose, readOnly = false }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<"todo" | "doing" | "done">(task.status);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [storyPoints, setStoryPoints] = useState<number | null>(task.storyPoints ?? null);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId?.toString() ?? "");
  const [aiReasoning, setAiReasoning] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [showInventory, setShowInventory]   = useState(
    !!(task.inventoryItems && task.inventoryItems.length > 0)
  );
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    hydrateInventoryItems(task.inventoryItems)
  );

  const generateDescription = useAction(api.ai.generateTaskDescription);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);
  const members = useQuery(api.workspaces.listMembers,{
    workspaceId: workspaceId as any,
  });
  
  const addInventoryItem = () =>
    setInventoryItems(prev => [...prev, { ...EMPTY_ITEM }]);
 
  const removeInventoryItem = (idx: number) =>
    setInventoryItems(prev => prev.filter((_, i) => i !== idx));
 
  const updateInventoryItem = (idx: number, patch: Partial<InventoryItem>) =>
    setInventoryItems(prev =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
 
  const impact = getInventoryImpact(inventoryItems);

  const isLocked = readOnly;

  const handleGenerateDescription = async () => {
    if (!title.trim()) { setError("Enter a title first."); return; }
    setError("");
    setLoadingAI(true);
    try {
      const result = await generateDescription({
        title: title.trim(),
        workspaceId: workspaceId as any,
      });
      setDescription(result.description);
      setStoryPoints(result.storyPoints);
      setAiReasoning(result.reasoning);
    } catch (e) {
      setError("AI generation failed. Check your GEMINI_API_KEY.");
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    
    const hasUnnamed = inventoryItems.some(i => !i.name.trim());
    if (hasUnnamed) { setError("All inventory items must have a name, or remove empty rows."); return; }
 
    const filledItems = inventoryItems.filter(i => i.name.trim());

    setError("");
    setSaving(true);
    try {
      await updateTask({
        taskId: task._id as any,
        title: title.trim(),
        description: description.trim(),
        status,
        assigneeId: assigneeId ? assigneeId as any : undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        storyPoints: storyPoints ?? undefined,
        inventoryItems: filledItems.length > 0
          ? filledItems.map(i => ({
              name:         i.name.trim(),
              status:       i.status,
              quantity:     i.quantity,
              expectedDate: i.expectedDate ? new Date(i.expectedDate).getTime() : undefined,
              notes:        i.notes?.trim() || undefined,
            }))
          : undefined,
        inventoryBlocked: filledItems.length > 0 ? impact.blocked : undefined,
      });
      onClose();
    } catch (e) {
      setError("Failed to save. Please try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await removeTask({ taskId: task._id as any });
      onClose();
    } catch (e) {
      setError("Failed to delete task.");
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 scrollbar scrollbar-thumb-rounded scrollbar-thumb-iris scrollbar-track-100 scrollbar-thin"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg mx-4 my-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-indigo dark:text-white flex items-center gap-2">
            <BsRobot className="text-iris" size={20} />
            Edit Task
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <FiX size={20} />
          </button>
        </div>

        {/* AI suggestion banner if date was AI-suggested */}
        {task.iddSuggested && task.aiReason && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-iris/5 border border-iris/20 text-xs text-iris">
            <BsRobot size={13} className="mt-0.5 shrink-0" />
            <span><strong>AI suggested:</strong> {task.aiReason}</span>
          </div>
        )}

        {/* Inventory blocked banner — shown at top if task is currently blocked */}
        {task.inventoryBlocked && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#FFB2BE]/10 border border-[#FFB2BE]/30 text-xs font-semibold text-[#FFB2BE]">
            <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>This task is inventory-blocked. Update part statuses below when they become available.</span>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            disabled={isLocked}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
          />
        </div>

        {/* Description + AI button */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <button
              onClick={handleGenerateDescription}
              disabled={loadingAI || !title.trim()}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-iris/10 text-iris hover:bg-iris/20 disabled:opacity-40 rounded-full transition"
            >
              <FiZap size={12} />
              {loadingAI ? "Generating..." : "✨ Regenerate with AI"}
            </button>
          </div>
          <textarea
            value={description}
            disabled={isLocked}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50 resize-none"
          />
          {aiReasoning && (
            <p className="text-xs text-iris/80 flex items-center gap-1">
              <BsRobot size={11} /> {aiReasoning}
            </p>
          )}
        </div>

        {/* Story points + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Story Points</label>
            <div className="flex flex-wrap gap-1.5">
              {STORY_POINTS.map((pt) => (
                <button
                  key={pt}
                  disabled={isLocked}
                  onClick={() => setStoryPoints(storyPoints === pt ? null : pt)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                    storyPoints === pt
                      ? "bg-iris text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-iris/20"
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={isLocked}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/*  Assignee + Due date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <FiUser size={13} /> Assignee
            </label>
            <select
              value={assigneeId}
              disabled={isLocked}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
            >
              <option value="">Unassigned</option>
              {(members ?? []).map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <FiCalendar size={13} /> Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            disabled={isLocked}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/50"
          />
        </div>
        </div>

        {/* ── Inventory Dependencies (collapsible) ─────────────────────────── */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
 
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => {
              setShowInventory(v => !v);
              if (!showInventory && inventoryItems.length === 0) addInventoryItem();
            }}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <div className="flex items-center gap-2">
              <FiPackage size={14} className="text-[#766ED5]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Inventory Dependencies
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#766ED5]/10 text-[#766ED5]">
                Optional
              </span>
              {inventoryItems.length > 0 && (
                <span className="text-[10px] font-black text-gray-400 dark:text-[#8f909d]">
                  {inventoryItems.length} item{inventoryItems.length !== 1 ? "s" : ""}
                </span>
              )}
              {/* Live blocked indicator in header */}
              {impact.blocked && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFB2BE]/10 text-[#FFB2BE] uppercase tracking-widest">
                  Blocked
                </span>
              )}
            </div>
            {showInventory
              ? <FiChevronUp size={16} className="text-gray-400" />
              : <FiChevronDown size={16} className="text-gray-400" />
            }
          </button>
 
          {/* Expanded content */}
          {showInventory && (
            <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
 
              <p className="text-xs text-gray-400 dark:text-[#8f909d]">
                Update part statuses as they change — the AI will factor these into
                the next due date suggestion run.
              </p>
 
              {/* Item rows */}
              {inventoryItems.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-3 space-y-3"
                >
                  {/* Row 1: Name + status + remove */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateInventoryItem(idx, { name: e.target.value })}
                      placeholder="Part / item name"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/40"
                    />
                    <select
                      value={item.status}
                      onChange={(e) => updateInventoryItem(idx, { status: e.target.value as InventoryStatus })}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-iris/40"
                      style={{
                        color: INVENTORY_STATUS_OPTIONS.find(o => o.value === item.status)?.color,
                      }}
                    >
                      {INVENTORY_STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeInventoryItem(idx)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
 
                  {/* Row 2: Quantity + expected date */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-1 block">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity ?? ""}
                        onChange={(e) => updateInventoryItem(idx, {
                          quantity: e.target.value ? Number(e.target.value) : undefined,
                        })}
                        placeholder="e.g. 4"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/40"
                      />
                    </div>
                    {(item.status === "ordered" || item.status === "in_transit") && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-1 block">
                          Expected Date
                        </label>
                        <input
                          type="date"
                          value={item.expectedDate ?? ""}
                          onChange={(e) => updateInventoryItem(idx, { expectedDate: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/40"
                        />
                      </div>
                    )}
                  </div>
 
                  {/* Notes */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] mb-1 block">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={item.notes ?? ""}
                      onChange={(e) => updateInventoryItem(idx, { notes: e.target.value })}
                      placeholder="e.g. Supplier: XYZ Co."
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-iris/40"
                    />
                  </div>
 
                  {/* Status badge */}
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    style={{
                      color:           INVENTORY_STATUS_OPTIONS.find(o => o.value === item.status)?.color,
                      backgroundColor: INVENTORY_STATUS_OPTIONS.find(o => o.value === item.status)?.bg,
                    }}
                  >
                    <FiPackage size={10} />
                    {INVENTORY_STATUS_OPTIONS.find(o => o.value === item.status)?.label}
                  </div>
                </div>
              ))}
 
              {/* Add item */}
              <button
                type="button"
                onClick={addInventoryItem}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-[#8f909d] hover:border-[#766ED5] hover:text-[#766ED5] transition"
              >
                <FiPlus size={13} /> Add Item
              </button>
 
              {/* Timeline impact banner */}
              {inventoryItems.length > 0 && impact.message && (
                <div
                  className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    impact.blocked
                      ? "bg-[#FFB2BE]/10 border border-[#FFB2BE]/30 text-[#FFB2BE]"
                      : "bg-[#E9C349]/10 border border-[#E9C349]/30 text-[#E9C349]"
                  }`}
                >
                  <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>{impact.message}</span>
                </div>
              )}
 
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
              confirmDelete
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            }`}
          >
            <FiTrash2 size={14} />
            {deleting ? "Deleting..." : confirmDelete ? "Confirm delete" : "Delete"}
          </button>

          {/* Cancel confirm delete */}
          {confirmDelete && !deleting && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-iris text-white text-sm font-semibold hover:bg-iris/80 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}