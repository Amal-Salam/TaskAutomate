/* eslint-disable prettier/prettier */
"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// ── Import api using require to avoid circular type inference ────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = require("./_generated/api") as { api: any };

// ─── Shared Gemini caller ────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data      = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error(`Gemini returned no candidates.`);
  if (candidate.finishReason === "SAFETY") throw new Error("Gemini blocked by safety filters.");
  const raw = candidate.content?.parts?.[0]?.text ?? "";
  if (!raw) throw new Error(`Gemini returned empty text.`);
  return raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
}

// ─── Inventory helpers ───────────────────────────────────────────────────────
function inventoryImpactLabel(status: string): string {
  switch (status) {
    case "available":     return "available (no delay)";
    case "low_stock":     return "low stock (minor risk)";
    case "ordered":       return "ordered but not received (soft delay)";
    case "in_transit":    return "in transit (soft delay)";
    case "not_available": return "NOT AVAILABLE — hard blocker";
    default:              return status;
  }
}

function formatInventory(
  items: Array<{ name: string; status: string; quantity?: number; expectedDate?: number; notes?: string }>
): string {
  if (!items || items.length === 0) return "None";
  return items.map((item) => {
    const parts = [`  • ${item.name}: ${inventoryImpactLabel(item.status)}`];
    if (item.quantity !== undefined) parts.push(`    Quantity: ${item.quantity}`);
    if (item.expectedDate) parts.push(`    Expected: ${new Date(item.expectedDate).toISOString().split("T")[0]}`);
    if (item.notes) parts.push(`    Notes: ${item.notes}`);
    return parts.join("\n");
  }).join("\n");
}

// ─── 1. Smart Task Description ───────────────────────────────────────────────
export const generateTaskDescription = action({
  args: { title: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existingTasks = await ctx.runQuery(api.tasks.list, { workspaceId: args.workspaceId });

    const context = existingTasks.length > 0
      ? `Existing tasks: ${existingTasks.slice(0, 10).map((t: any) => t.title).join(", ")}`
      : "New workspace with no existing tasks.";

    const prompt = `You are a senior project manager writing actionable task descriptions.

${context}

New task title: "${args.title}"

Write a description including:
1. A 2-3 sentence overview
2. 2-4 bullet acceptance criteria
3. Technical considerations if relevant

Also suggest story points (1,2,3,5,8,13) based on complexity.

Respond ONLY with raw JSON (no markdown fences):
{"description":"...","storyPoints":3,"reasoning":"One sentence"}`;

    const raw = await callGemini(prompt);
    try {
      return JSON.parse(raw) as { description: string; storyPoints: number; reasoning: string };
    } catch (e) {
      throw new Error(`Failed to parse Gemini response. Raw: ${raw}`);
    }
  },
});

// ─── 2. Smart Due Date Suggestions (inventory-aware) ────────────────────────
export const suggestDueDates = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const tasks   = await ctx.runQuery(api.tasks.list, { workspaceId: args.workspaceId });
    const pending = tasks.filter((t: any) => t.status !== "done");
    if (!pending.length) return [];

    const today       = new Date().toISOString().split("T")[0];
    const taskSummary = pending.map((t: any) => {
      const hasInventory  = t.inventoryItems && t.inventoryItems.length > 0;
      const isBlocked     = t.inventoryBlocked === true;
      const latestArrival = hasInventory
        ? t.inventoryItems.filter((i: any) => i.expectedDate && i.status !== "available")
            .map((i: any) => i.expectedDate)
            .sort((a: number, b: number) => b - a)[0]
        : undefined;
      return {
        id:            t._id,
        title:         t.title,
        description:   t.description,
        status:        t.status,
        storyPoints:   t.storyPoints ?? null,
        currentDueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null,
        hasInventoryDependencies: hasInventory,
        inventoryBlocked:         isBlocked,
        latestPartArrivalDate:    latestArrival ? new Date(latestArrival).toISOString().split("T")[0] : null,
        inventoryItems:           hasInventory ? formatInventory(t.inventoryItems) : null,
      };
    });

    const blockedTasks   = taskSummary.filter((t: any) => t.inventoryBlocked);
    const unblockedTasks = taskSummary.filter((t: any) => !t.inventoryBlocked);

    const blockedSection = blockedTasks.length > 0
      ? `\nHARD-BLOCKED TASKS:\n${blockedTasks.map((t: any) =>
          `Task ID: ${t.id}\nTitle: ${t.title}\nInventory:\n${t.inventoryItems}\n→ Cannot start. Set date well beyond today with clear warning.`
        ).join("\n---\n")}`
      : "";

    const unblockedSection = `\nTASKS TO SCHEDULE:\n${unblockedTasks.map((t: any) =>
      `Task ID: ${t.id}\nTitle: ${t.title}\nStatus: ${t.status}\nStory Points: ${t.storyPoints ?? "not set"}\nCurrent due: ${t.currentDueDate ?? "none"}\n${
        t.hasInventoryDependencies
          ? `Inventory:\n${t.inventoryItems}\nLatest arrival: ${t.latestPartArrivalDate ?? "unknown"}\n→ Do not suggest date before latest arrival.`
          : "No inventory dependencies."
      }`
    ).join("\n---\n")}`;

    const prompt = `You are a project management AI. Today is ${today}.

SCHEDULING RULES:
- 1-2 pts = 1-2 days, 3-5 pts = 3-5 days, 8 pts = 1 week, 13 pts = 2 weeks
- Space tasks out, avoid clustering on same day
- "doing" tasks due sooner than "todo"
- If existing due date is reasonable, keep it

INVENTORY RULES:
- Hard-blocked: set date 2+ weeks out, state blocker in reason
- ordered/in_transit: date must not be before latest arrival + effort buffer
- low_stock: flag as risk but don't delay
${blockedSection}
${unblockedSection}

Respond ONLY with raw JSON array covering ALL tasks:
[{"id":"<task _id>","title":"<title>","suggestedDate":"YYYY-MM-DD","reason":"One sentence including inventory impact"}]`;

    const raw = await callGemini(prompt);
    let suggestions: Array<{ id: string; title: string; suggestedDate: string; reason: string }>;
    try { suggestions = JSON.parse(raw); }
    catch (e) { throw new Error(`Failed to parse Gemini response. Raw: ${raw}`); }

    for (const s of suggestions) {
      await ctx.runMutation(api.tasks.updateAISuggestion, {
        taskId:        s.id,
        suggestedDate: new Date(s.suggestedDate).getTime(),
        aiReason:      s.reason,
      });
    }
    return suggestions;
  },
});

// ─── 3. Intelligent Task Decomposition ──────────────────────────────────────
export const decomposeGoal = action({
  args: {
    workspaceId: v.id("workspaces"),
    goal:        v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const [members, tasks] = await Promise.all([
      ctx.runQuery(api.workspaces.listMembers, { workspaceId: args.workspaceId }),
      ctx.runQuery(api.tasks.list,             { workspaceId: args.workspaceId }),
    ]);

    const memberContext = (members as any[]).map((m) => {
      const assigned = (tasks as any[]).filter((t) => t.assigneeId?.toString() === m.userId);
      const done     = assigned.filter((t) => t.status === "done").length;
      return `- ${m.name} (${m.role}): ${assigned.length} tasks assigned, ${done} completed`;
    }).join("\n");

    const today  = new Date().toISOString().split("T")[0];
    const prompt = `You are a senior project manager. Today is ${today}.

Break down this high-level goal into concrete, actionable subtasks:
Goal: "${args.goal}"

Team members and their work history:
${memberContext || "No members yet — do not suggest assignees."}

Rules:
- Create 3-7 subtasks (no more, no less)
- Each subtask should be completable in 1-13 story points
- Suggest the best team member for each subtask based on their history and role
- If no clear match, leave suggestedAssigneeName as null
- Start dates should be staggered realistically from today
- Each subtask needs a clear, specific title and description

Respond ONLY with raw JSON array (no markdown fences):
[{
  "title": "Subtask title",
  "description": "2-3 sentence description with clear acceptance criteria",
  "storyPoints": 3,
  "suggestedAssigneeName": "Member name or null",
  "suggestedDueDays": 5,
  "reason": "Why this person, why these points"
}]`;

    const raw = await callGemini(prompt);
    try {
      const subtasks = JSON.parse(raw) as Array<{
        title:                 string;
        description:           string;
        storyPoints:           number;
        suggestedAssigneeName: string | null;
        suggestedDueDays:      number;
        reason:                string;
      }>;

      return subtasks.map((s) => {
        const match = (members as any[]).find(
          (m) => m.name?.toLowerCase() === s.suggestedAssigneeName?.toLowerCase()
        );
        return {
          ...s,
          suggestedAssigneeId:   match?.userId   ?? null,
          suggestedAssigneeName: match?.name     ?? s.suggestedAssigneeName,
          suggestedDueDate:      new Date(Date.now() + s.suggestedDueDays * 86400000).toISOString().split("T")[0],
        };
      });
    } catch (e) {
      throw new Error(`Failed to parse decomposition response. Raw: ${raw}`);
    }
  },
});

// ─── 4. Natural Language Task Parsing ───────────────────────────────────────
export const parseNaturalLanguageTask = action({
  args: {
    workspaceId: v.id("workspaces"),
    input:       v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const members    = await ctx.runQuery(api.workspaces.listMembers, { workspaceId: args.workspaceId });
    const today      = new Date().toISOString().split("T")[0];
    const memberList = (members as any[]).map((m) => `- ${m.name} (userId: ${m.userId})`).join("\n");

    const prompt = `You are a task management AI that extracts structured task data from natural language. Today is ${today}.

Team members:
${memberList || "None yet"}

User input: "${args.input}"

Extract the following fields. If a field is not mentioned, set it to null.
For relative dates like "next Friday", "tomorrow", "in 3 days" — compute the absolute date from today (${today}).
For priority — map "high priority/urgent/asap" → 1, "medium/normal" → 2, "low/whenever" → 3, not mentioned → null.
For status — "in progress/doing/started" → "doing", "done/finished/complete" → "done", default → "todo".
For assigneeName — match to team member names above (fuzzy match). Return the userId if found.

Respond ONLY with raw JSON (no markdown fences):
{
  "title": "Task title or null",
  "description": "Inferred description or null",
  "assigneeName": "Name or null",
  "assigneeId": "userId or null",
  "dueDate": "YYYY-MM-DD or null",
  "status": "todo|doing|done",
  "storyPoints": null,
  "confidence": 0.95,
  "parsedFields": ["title", "assignee", "dueDate"]
}`;

    const raw = await callGemini(prompt);
    try {
      return JSON.parse(raw) as {
        title:        string | null;
        description:  string | null;
        assigneeName: string | null;
        assigneeId:   string | null;
        dueDate:      string | null;
        status:       "todo" | "doing" | "done";
        storyPoints:  number | null;
        confidence:   number;
        parsedFields: string[];
      };
    } catch (e) {
      throw new Error(`Failed to parse NLP response. Raw: ${raw}`);
    }
  },
});

// ─── 5. Burndown Prediction with Confidence Intervals ───────────────────────
export const predictBurndown = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const [tasks, snapshots] = await Promise.all([
      ctx.runQuery(api.tasks.list,                        { workspaceId: args.workspaceId }),
      ctx.runQuery(api.taskHistory.getVelocitySnapshots,  { workspaceId: args.workspaceId, daysBack: 14 }),
    ]);

    const remainingPoints = (tasks as any[])
      .filter((t) => t.status !== "done")
      .reduce((sum: number, t: any) => sum + (t.storyPoints ?? 2), 0);

    const totalPoints = (tasks as any[]).reduce((sum: number, t: any) => sum + (t.storyPoints ?? 2), 0);
    const donePoints  = (tasks as any[]).filter((t: any) => t.status === "done")
      .reduce((sum: number, t: any) => sum + (t.storyPoints ?? 2), 0);

    const velocities = (snapshots as any[]).length > 0
      ? (snapshots as any[]).map((s: any) => s.pointsCompleted).filter((v: number) => v > 0)
      : [2];

    const avgVelocity = velocities.reduce((a: number, b: number) => a + b, 0) / velocities.length;
    const stdDev      = velocities.length > 1
      ? Math.sqrt(velocities.map((v: number) => Math.pow(v - avgVelocity, 2)).reduce((a: number, b: number) => a + b, 0) / velocities.length)
      : avgVelocity * 0.3;

    // ── Monte Carlo simulation (1000 runs) ───────────────────────────────
    const SIMULATIONS    = 1000;
    const completionDays: number[] = [];

    for (let i = 0; i < SIMULATIONS; i++) {
      let points = remainingPoints;
      let days   = 0;
      while (points > 0 && days < 365) {
        const u1 = Math.random(), u2 = Math.random();
        const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const dailyVelocity = Math.max(0.5, avgVelocity + z * stdDev);
        points -= dailyVelocity;
        days++;
      }
      completionDays.push(days);
    }

    completionDays.sort((a, b) => a - b);
    const p10 = completionDays[Math.floor(SIMULATIONS * 0.10)];
    const p50 = completionDays[Math.floor(SIMULATIONS * 0.50)];
    const p90 = completionDays[Math.floor(SIMULATIONS * 0.90)];

    const toDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    };

    const upcomingDeadlines = (tasks as any[])
      .filter((t) => t.status !== "done" && t.dueDate)
      .sort((a: any, b: any) => a.dueDate - b.dueDate);
    const nearestDeadline = upcomingDeadlines[0]?.dueDate;
    const deadlineDays    = nearestDeadline ? Math.ceil((nearestDeadline - Date.now()) / 86400000) : null;
    const onTimeProb      = deadlineDays != null
      ? Math.round((completionDays.filter((d) => d <= deadlineDays).length / SIMULATIONS) * 100)
      : null;

    const prompt = `You are a project management analyst. Interpret this Monte Carlo burndown simulation:

Remaining work: ${remainingPoints} story points
Average daily velocity: ${avgVelocity.toFixed(1)} points/day (std dev: ${stdDev.toFixed(1)})
Simulation results (1000 runs):
- Optimistic (P10): ${p10} days → ${toDate(p10)}
- Most likely (P50): ${p50} days → ${toDate(p50)}
- Pessimistic (P90): ${p90} days → ${toDate(p90)}
${onTimeProb != null ? `Nearest deadline: ${deadlineDays} days away — on-time probability: ${onTimeProb}%` : "No deadlines set."}

Write 2-3 sentences interpreting what this means for the team.
Respond ONLY with raw JSON (no markdown fences):
{"interpretation":"...","riskLevel":"low|medium|high","keyAction":"One sentence recommendation"}`;

    const raw = await callGemini(prompt);
    let aiInterpretation: { interpretation: string; riskLevel: string; keyAction: string };
    try { aiInterpretation = JSON.parse(raw); }
    catch { aiInterpretation = { interpretation: "Unable to generate interpretation.", riskLevel: "medium", keyAction: "Review task estimates." }; }

    return {
      remainingPoints,
      totalPoints,
      donePoints,
      avgVelocity:     parseFloat(avgVelocity.toFixed(1)),
      stdDev:          parseFloat(stdDev.toFixed(1)),
      optimistic:      { days: p10, date: toDate(p10) },
      mostLikely:      { days: p50, date: toDate(p50) },
      pessimistic:     { days: p90, date: toDate(p90) },
      onTimeProb,
      nearestDeadline: nearestDeadline ? new Date(nearestDeadline).toISOString().split("T")[0] : null,
      aiInterpretation,
      simulationRuns:  SIMULATIONS,
    };
  },
});

// ─── 6. Workload Balancing Recommendations ───────────────────────────────────
export const suggestWorkloadBalance = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const [tasks, members] = await Promise.all([
      ctx.runQuery(api.tasks.list,              { workspaceId: args.workspaceId }),
      ctx.runQuery(api.workspaces.listMembers,  { workspaceId: args.workspaceId }),
    ]);

    const activeTasks = (tasks as any[]).filter((t) => t.status !== "done");

    const workload = (members as any[]).map((m) => {
      const assigned  = activeTasks.filter((t) => t.assigneeId?.toString() === m.userId);
      const points    = assigned.reduce((sum: number, t: any) => sum + (t.storyPoints ?? 2), 0);
      const taskCount = assigned.length;
      const overdue   = assigned.filter((t: any) => t.dueDate && t.dueDate < Date.now()).length;
      return {
        userId: m.userId, name: m.name, role: m.role,
        points, taskCount, overdue,
        tasks: assigned.map((t: any) => ({ id: t._id, title: t.title, points: t.storyPoints ?? 2 })),
      };
    });

    const unassigned = activeTasks.filter((t: any) => !t.assigneeId);
    const avgPoints  = workload.reduce((s: number, m: any) => s + m.points, 0) / Math.max(workload.length, 1);

    const prompt = `You are a resource allocation optimizer. Analyze this team's workload and suggest rebalancing.

Team workload (active tasks only):
${workload.map((m: any) => `${m.name} (${m.role}): ${m.points} story points, ${m.taskCount} tasks, ${m.overdue} overdue`).join("\n")}

Team average: ${avgPoints.toFixed(1)} points per person
Unassigned tasks: ${unassigned.length} (${unassigned.reduce((s: number, t: any) => s + (t.storyPoints ?? 2), 0)} points)

Identify overloaded (>50% above average), underutilized (>30% below average), and suggest reassignments.

Respond ONLY with raw JSON (no markdown fences):
{
  "overloaded": ["name"],
  "underutilized": ["name"],
  "recommendations": [{"from":"name or unassigned","to":"name","taskTitle":"...","reason":"..."}],
  "summary": "2 sentence summary",
  "balanceScore": 75
}`;

    const raw = await callGemini(prompt);
    try {
      const result = JSON.parse(raw);
      return { ...result, workload, unassignedCount: unassigned.length };
    } catch (e) {
      throw new Error(`Failed to parse workload response. Raw: ${raw}`);
    }
  },
});

// ─── 7. Velocity Anomaly Detection ──────────────────────────────────────────
export const detectVelocityAnomalies = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const [history, members, tasks] = await Promise.all([
      ctx.runQuery(api.taskHistory.getWorkspaceHistory, { workspaceId: args.workspaceId, daysBack: 30 }),
      ctx.runQuery(api.workspaces.listMembers,          { workspaceId: args.workspaceId }),
      ctx.runQuery(api.tasks.list,                      { workspaceId: args.workspaceId }),
    ]);

    const now         = Date.now();
    const memberStats = (members as any[]).map((m) => {
      const completions = (history as any[]).filter(
        (h) => h.toStatus === "done" && h.changedBy.toString() === m.userId
      );
      const byWeek: Record<string, number> = {};
      for (const c of completions) {
        const week = new Date(c.changedAt).toISOString().slice(0, 7);
        byWeek[week] = (byWeek[week] ?? 0) + (c.storyPoints ?? 2);
      }
      const weeklyPoints = Object.values(byWeek);
      const avg    = weeklyPoints.length > 0 ? weeklyPoints.reduce((a, b) => a + b, 0) / weeklyPoints.length : 0;
      const stdDev = weeklyPoints.length > 1
        ? Math.sqrt(weeklyPoints.map((v) => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / weeklyPoints.length)
        : 0;

      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      const thisWeekPoints = completions
        .filter((c: any) => c.changedAt >= thisWeekStart.getTime())
        .reduce((sum: number, c: any) => sum + (c.storyPoints ?? 2), 0);

      const isAnomaly = stdDev > 0 && Math.abs(thisWeekPoints - avg) > 2 * stdDev;
      const direction = thisWeekPoints < avg ? "drop" : "spike";
      return {
        userId: m.userId, name: m.name,
        avgWeeklyPoints: parseFloat(avg.toFixed(1)),
        thisWeekPoints, stdDev: parseFloat(stdDev.toFixed(1)),
        isAnomaly, direction: isAnomaly ? direction : null,
        totalCompleted: completions.length,
      };
    });

    const anomalies = memberStats.filter((m) => m.isAnomaly);

    const longRunning = (tasks as any[])
      .filter((t) => t.status === "doing" && t.storyPoints)
      .map((t) => {
        const entry = (history as any[])
          .filter((h) => h.taskId.toString() === t._id && h.toStatus === "doing")
          .sort((a: any, b: any) => b.changedAt - a.changedAt)[0];
        if (!entry) return null;
        const daysInProgress = (now - entry.changedAt) / 86400000;
        const expectedDays   = t.storyPoints <= 2 ? 2 : t.storyPoints <= 5 ? 5 : t.storyPoints <= 8 ? 7 : 14;
        if (daysInProgress <= expectedDays * 2) return null;
        return {
          taskId: t._id, title: t.title,
          daysInProgress: parseFloat(daysInProgress.toFixed(1)),
          expectedDays, storyPoints: t.storyPoints,
          assigneeName: (members as any[]).find((m) => m.userId === t.assigneeId?.toString())?.name ?? "Unassigned",
        };
      })
      .filter(Boolean);

    if (anomalies.length === 0 && longRunning.length === 0) {
      return { anomalies: [], longRunning: [], memberStats, summary: "No anomalies detected. Team velocity is within normal range." };
    }

    const prompt = `You are a project health analyst. Flag these velocity anomalies:

Member velocity anomalies (this week vs 30-day average):
${anomalies.map((a) => `${a.name}: expected ~${a.avgWeeklyPoints} pts/week, got ${a.thisWeekPoints} pts (${a.direction})`).join("\n") || "None"}

Long-running tasks:
${longRunning.map((t: any) => `"${t.title}" — ${t.daysInProgress} days in progress (expected ${t.expectedDays}), assigned to ${t.assigneeName}`).join("\n") || "None"}

Respond ONLY with raw JSON (no markdown fences):
{"summary":"...","urgency":"low|medium|high","topAction":"One sentence"}`;

    const raw = await callGemini(prompt);
    let aiSummary: { summary: string; urgency: string; topAction: string };
    try { aiSummary = JSON.parse(raw); }
    catch { aiSummary = { summary: "Anomalies detected.", urgency: "medium", topAction: "Review flagged items." }; }

    return { anomalies, longRunning, memberStats, aiSummary };
  },
});

// ─── 8. AI Retrospective Generator ──────────────────────────────────────────
export const generateRetrospective = action({
  args: {
    workspaceId: v.id("workspaces"),
    sprintId:    v.id("sprints"),
    sprintName:  v.string(),
    startDate:   v.number(),
    endDate:     v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const [tasks, history, members] = await Promise.all([
      ctx.runQuery(api.tasks.list,                      { workspaceId: args.workspaceId }),
      ctx.runQuery(api.taskHistory.getWorkspaceHistory, { workspaceId: args.workspaceId, daysBack: 60 }),
      ctx.runQuery(api.workspaces.listMembers,          { workspaceId: args.workspaceId }),
    ]);

    const sprintHistory = (history as any[]).filter(
      (h) => h.changedAt >= args.startDate && h.changedAt <= args.endDate
    );
    const completed    = (tasks as any[]).filter((t) => t.status === "done");
    const overdue      = (tasks as any[]).filter((t) => t.status !== "done" && t.dueDate && t.dueDate < args.endDate);
    const aiAccepted   = (tasks as any[]).filter((t) => !t.iddSuggested && t.aiReason);
    const completedPts = completed.reduce((sum: number, t: any) => sum + (t.storyPoints ?? 2), 0);
    const totalPts     = (tasks as any[]).reduce((sum: number, t: any) => sum + (t.storyPoints ?? 2), 0);

    const memberContributions = (members as any[]).map((m) => {
      const done = sprintHistory.filter(
        (h: any) => h.toStatus === "done" && h.changedBy.toString() === m.userId
      ).length;
      return `${m.name}: ${done} tasks completed`;
    }).join("\n");

    const startStr = new Date(args.startDate).toISOString().split("T")[0];
    const endStr   = new Date(args.endDate).toISOString().split("T")[0];

    const prompt = `You are a project retrospective AI. Generate an honest, constructive retrospective.

Sprint: "${args.sprintName}" (${startStr} → ${endStr})

Metrics:
- Tasks completed: ${completed.length}/${(tasks as any[]).length}
- Story points completed: ${completedPts}/${totalPts}
- Overdue tasks at sprint end: ${overdue.length}
- AI date suggestions used: ${aiAccepted.length}

Team contributions:
${memberContributions}

Overdue tasks:
${overdue.map((t: any) => `- "${t.title}" (${t.storyPoints ?? "?"}pts)`).join("\n") || "None"}

Respond ONLY with raw JSON (no markdown fences):
{
  "summary": "2-3 sentence sprint summary",
  "wentWell": ["item 1", "item 2", "item 3"],
  "wentPoorly": ["item 1", "item 2"],
  "aiVsActual": "One paragraph comparing AI predictions to actual outcomes",
  "recommendations": ["action 1", "action 2", "action 3"]
}`;

    const raw = await callGemini(prompt);
    let retro: { summary: string; wentWell: string[]; wentPoorly: string[]; aiVsActual: string; recommendations: string[] };
    try { retro = JSON.parse(raw); }
    catch (e) { throw new Error(`Failed to parse retrospective. Raw: ${raw}`); }

    await ctx.runMutation(api.sprints.saveRetrospective, {
      sprintId:      args.sprintId,
      retrospective: { ...retro, generatedAt: Date.now() },
    });

    return retro;
  },
});

// ─── 9. Focus Time Suggestions (pattern-based, no OAuth) ────────────────────
export const suggestFocusTime = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const [tasks, history, members] = await Promise.all([
      ctx.runQuery(api.tasks.list,                      { workspaceId: args.workspaceId }),
      ctx.runQuery(api.taskHistory.getWorkspaceHistory, { workspaceId: args.workspaceId, daysBack: 14 }),
      ctx.runQuery(api.workspaces.listMembers,          { workspaceId: args.workspaceId }),
    ]);

    const today   = new Date();
    const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    const byDow: Record<number, number> = {};
    for (const h of history as any[]) {
      if (h.toStatus === "done") {
        const dow = new Date(h.changedAt).getDay();
        byDow[dow] = (byDow[dow] ?? 0) + 1;
      }
    }

    const urgentTasks = (tasks as any[])
      .filter((t) => t.status !== "done" && t.dueDate)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5);

    const prompt = `You are a productivity advisor. Suggest focus time blocks based on team patterns.

Today: ${dayName[today.getDay()]}, ${today.toISOString().split("T")[0]}
Team size: ${(members as any[]).length} members

Historical completion patterns (tasks completed per day of week):
${Object.entries(byDow).map(([dow, count]) => `${dayName[+dow]}: ${count} completions`).join("\n") || "No history yet"}

Upcoming urgent tasks (next 7 days):
${urgentTasks.map((t: any) => `- "${t.title}" due ${new Date(t.dueDate).toISOString().split("T")[0]}`).join("\n") || "No urgent tasks"}

Suggest 3 focus time blocks for the next 5 working days.

Respond ONLY with raw JSON (no markdown fences):
[{
  "day": "Tuesday",
  "date": "YYYY-MM-DD",
  "timeBlock": "9:00 AM – 11:00 AM",
  "focusType": "Deep work",
  "recommendedTasks": ["task type"],
  "reason": "One sentence"
}]`;

    const raw = await callGemini(prompt);
    try { return JSON.parse(raw); }
    catch (e) { throw new Error(`Failed to parse focus time response. Raw: ${raw}`); }
  },
});