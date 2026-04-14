/* eslint-disable prettier/prettier */
import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { FiSearch, FiX, FiCheck, FiAlertTriangle, FiZap } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

interface ParsedTask {
  title:        string | null;
  description:  string | null;
  assigneeName: string | null;
  assigneeId:   string | null;
  dueDate:      string | null;
  status:       "todo" | "doing" | "done";
  storyPoints:  number | null;
  confidence:   number;
  parsedFields: string[];
}

export default function CommandBar({ workspaceId, onClose }: Props) {
  const [input, setInput]         = useState("");
  const [parsed, setParsed]       = useState<ParsedTask | null>(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);

  const parseNLTask = useAction(api.ai.parseNaturalLanguageTask);
  const createTask  = useMutation(api.tasks.create);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const members     = useQuery(api.workspaces.listMembers, { workspaceId: workspaceId as any });

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleParse = async () => {
    if (!input.trim()) return;
    setError("");
    setParsed(null);
    setLoading(true);
    try {
      const result = await parseNLTask({ workspaceId: workspaceId as any, input: input.trim() });
      setParsed(result as ParsedTask);
    } catch (e: any) {
      setError(e.message ?? "Failed to parse. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!parsed?.title) { setError("Could not extract a task title."); return; }
    setError("");
    setSaving(true);
    try {
      await createTask({
        workspaceId:  workspaceId as any,
        title:        parsed.title,
        description:  parsed.description ?? `Task created via natural language: "${input}"`,
        status:       parsed.status,
        assigneeId:   parsed.assigneeId ? parsed.assigneeId as any : undefined,
        dueDate:      parsed.dueDate ? new Date(parsed.dueDate).getTime() : undefined,
        storyPoints:  parsed.storyPoints ?? undefined,
      });
      setSaved(true);
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      setError(e.message ?? "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = parsed
    ? parsed.confidence >= 0.8 ? "#10b981"
    : parsed.confidence >= 0.5 ? "#E9C349"
    : "#FFB2BE"
    : "#8f909d";

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--clr-surface-mid, #1c1f2a)",
          border:     "1px solid var(--clr-border, rgba(99,102,241,0.2))",
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          {loading
            ? <BsRobot size={18} style={{ color: "#766ED5" }} className="animate-pulse shrink-0" />
            : <FiSearch size={18} style={{ color: "#8f909d" }} className="shrink-0" />
          }
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setParsed(null); setSaved(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleParse(); }}
            placeholder='Try: "Assign the API task to Amara, due next Friday, high priority"'
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#454652] focus:outline-none"
          />
          {input && (
            <button onClick={() => { setInput(""); setParsed(null); }} className="text-[#8f909d] hover:text-white transition">
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Hint row */}
        {!parsed && !loading && (
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#454652]">
              Press Enter to parse · Esc to close
            </p>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#766ED5]/10 text-[#766ED5] uppercase tracking-widest flex items-center gap-1">
              <FiZap size={9} /> AI Powered
            </span>
          </div>
        )}

        {/* Parsed result */}
        {parsed && (
          <div className="p-4 space-y-3">
            {/* Confidence bar */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8f909d]">Confidence</p>
              <div className="flex-1 h-1 bg-[#0A0E18] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${parsed.confidence * 100}%`, background: confidenceColor }}
                />
              </div>
              <p className="text-[10px] font-black" style={{ color: confidenceColor }}>
                {Math.round(parsed.confidence * 100)}%
              </p>
            </div>

            {/* Extracted fields */}
            <div className="rounded-xl border border-white/5 bg-[#0A0E18] divide-y divide-white/5 overflow-hidden">
              {[
                { label: "Title",    value: parsed.title,        parsed: parsed.parsedFields.includes("title") },
                { label: "Assignee", value: parsed.assigneeName, parsed: parsed.parsedFields.includes("assignee") },
                { label: "Due Date", value: parsed.dueDate ? new Date(parsed.dueDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : null, parsed: parsed.parsedFields.includes("dueDate") },
                { label: "Status",   value: parsed.status,       parsed: parsed.parsedFields.includes("status") },
                { label: "Points",   value: parsed.storyPoints ? `${parsed.storyPoints}pt` : null, parsed: parsed.parsedFields.includes("storyPoints") },
              ].map((field) => field.value && (
                <div key={field.label} className="flex items-center justify-between px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#454652]">{field.label}</span>
                  <span className={`text-xs font-semibold ${field.parsed ? "text-white" : "text-[#8f909d]"}`}>
                    {field.value}
                    {field.parsed && <span className="ml-1.5 text-[#766ED5] text-[9px]">✓ parsed</span>}
                  </span>
                </div>
              ))}
            </div>

            {parsed.confidence < 0.5 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFB2BE]/10 border border-[#FFB2BE]/20">
                <FiAlertTriangle size={12} className="text-[#FFB2BE] shrink-0" />
                <p className="text-[10px] text-[#FFB2BE]">Low confidence — review fields before creating</p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setParsed(null); inputRef.current?.focus(); }}
                className="px-3 py-2 rounded-xl border border-white/10 text-xs text-[#C6C5D4] hover:bg-white/5 transition"
              >
                Re-parse
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || saved || !parsed.title}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 transition"
                style={{ background: saved ? "#10b981" : "linear-gradient(135deg, #BBC3FF 0%, #2C3C99 100%)" }}
              >
                {saved
                  ? <><FiCheck size={13} /> Created!</>
                  : saving
                  ? "Creating…"
                  : <><FiZap size={13} /> Create Task</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}