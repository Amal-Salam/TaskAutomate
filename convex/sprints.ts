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

async function requireAdmin(ctx: any, workspaceId: any) {
  const { user, member } = await requireMember(ctx, workspaceId);
  if (member.role !== "admin") throw new Error("Admin access required");
  return { user, member };
}

// ── Create a sprint ───────────────────────────────────────────────────────
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name:        v.string(),
    startDate:   v.number(),
    endDate:     v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.workspaceId);

    // Deactivate any currently active sprint
    const active = await ctx.db
      .query("sprints")
      .withIndex("byStatus", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "active")
      )
      .first();
    if (active) {
      await ctx.db.patch(active._id, { status: "planned" });
    }

    return ctx.db.insert("sprints", {
      workspaceId: args.workspaceId,
      name:        args.name.trim(),
      startDate:   args.startDate,
      endDate:     args.endDate,
      status:      "active",
      createdBy:   user._id,
      createdAt:   Date.now(),
    });
  },
});

// ── List all sprints for a workspace ──────────────────────────────────────
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    return ctx.db
      .query("sprints")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

// ── Get the currently active sprint ──────────────────────────────────────
export const getActive = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    return ctx.db
      .query("sprints")
      .withIndex("byStatus", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "active")
      )
      .first();
  },
});

// ── Complete a sprint (sets status + stores retrospective) ───────────────
export const complete = mutation({
  args: {
    sprintId:      v.id("sprints"),
    retrospective: v.optional(v.object({
      generatedAt:     v.number(),
      summary:         v.string(),
      wentWell:        v.array(v.string()),
      wentPoorly:      v.array(v.string()),
      aiVsActual:      v.string(),
      recommendations: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found");
    await requireAdmin(ctx, sprint.workspaceId);
    await ctx.db.patch(args.sprintId, {
      status:        "completed",
      retrospective: args.retrospective,
    });
  },
});

// ── Save retrospective to an existing completed sprint ───────────────────
export const saveRetrospective = mutation({
  args: {
    sprintId: v.id("sprints"),
    retrospective: v.object({
      generatedAt:     v.number(),
      summary:         v.string(),
      wentWell:        v.array(v.string()),
      wentPoorly:      v.array(v.string()),
      aiVsActual:      v.string(),
      recommendations: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found");
    await requireAdmin(ctx, sprint.workspaceId);
    await ctx.db.patch(args.sprintId, { retrospective: args.retrospective });
  },
});