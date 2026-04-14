/* eslint-disable prettier/prettier */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireMember(ctx: any, workspaceId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("byClerk", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("User not found");
  const member = await ctx.db
    .query("members")
    .withIndex("byWorkspace", (q: any) => q.eq("workspaceId", workspaceId))
    .filter((q: any) => q.eq(q.field("userId"), user._id))
    .first();
  if (!member) throw new Error("Forbidden");
  return { user, member };
}

// ── Log a status change ───────────────────────────────────────────────────
export const logStatusChange = mutation({
  args: {
    taskId:      v.id("tasks"),
    workspaceId: v.id("workspaces"),
    fromStatus:  v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    toStatus:    v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    storyPoints: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMember(ctx, args.workspaceId);
    await ctx.db.insert("taskHistory", {
      taskId:      args.taskId,
      workspaceId: args.workspaceId,
      changedBy:   user._id,
      fromStatus:  args.fromStatus,
      toStatus:    args.toStatus,
      changedAt:   Date.now(),
      storyPoints: args.storyPoints,
    });
  },
});

// ── Get full history for a single task ───────────────────────────────────
export const getTaskHistory = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return [];
    await requireMember(ctx, task.workspaceId);
    return ctx.db
      .query("taskHistory")
      .withIndex("byTask", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

// ── Get all history for a workspace (last N days) ────────────────────────
export const getWorkspaceHistory = query({
  args: {
    workspaceId: v.id("workspaces"),
    daysBack:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const since = Date.now() - (args.daysBack ?? 30) * 24 * 60 * 60 * 1000;
    const all = await ctx.db
      .query("taskHistory")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
    return all.filter((h) => h.changedAt >= since);
  },
});

// ── Velocity snapshot: upsert today's snapshot ───────────────────────────
export const upsertVelocitySnapshot = mutation({
  args: {
    workspaceId:     v.id("workspaces"),
    pointsCompleted: v.number(),
    tasksCompleted:  v.number(),
    totalTasks:      v.number(),
    totalPoints:     v.number(),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("velocitySnapshots")
      .withIndex("byWorkspaceDate", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("date", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pointsCompleted: args.pointsCompleted,
        tasksCompleted:  args.tasksCompleted,
        totalTasks:      args.totalTasks,
        totalPoints:     args.totalPoints,
      });
    } else {
      await ctx.db.insert("velocitySnapshots", {
        workspaceId:     args.workspaceId,
        date:            today,
        pointsCompleted: args.pointsCompleted,
        tasksCompleted:  args.tasksCompleted,
        totalTasks:      args.totalTasks,
        totalPoints:     args.totalPoints,
      });
    }
  },
});

// ── Get velocity snapshots for the last N days ───────────────────────────
export const getVelocitySnapshots = query({
  args: {
    workspaceId: v.id("workspaces"),
    daysBack:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const snapshots = await ctx.db
      .query("velocitySnapshots")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
    return snapshots.slice(0, args.daysBack ?? 30);
  },
});