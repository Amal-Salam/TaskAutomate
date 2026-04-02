/* eslint-disable prettier/prettier */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateWorkspaceName } from "./validators";

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
  if (member.role !== "admin") throw new Error("Forbidden — admin access required");
  return { user, member };
}

// Get all workspaces the current user is a member of
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const memberships = await ctx.db
      .query("members")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .collect();

    const workspaces = await Promise.all(
      memberships.map((m) => ctx.db.get(m.workspaceId))
    );

    return workspaces
      .filter(Boolean)
      .map((ws) => ({
        ...ws!,
        role: memberships.find((m) => m.workspaceId === ws!._id)?.role,
      }));
  },
});

// Get all members of a workspace with their user details
export const listMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const memberships = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
 
    const users = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        if (!user) return null;
        return {
          memberId: m._id.toString(),
          userId: user._id.toString(),
          name: user.name ?? user.email ?? "Unknown",
          email: user.email,
          role: m.role,
        };
      })
    );
 
    return users.filter(Boolean) as {
      memberId:string;
      userId: string;
      name: string;
      email: string;
      role: "admin" | "member";
    }[];
  },
});

// Create a new workspace and make the creator an admin member
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    const name = validateWorkspaceName(args.name);
    const workspaceId = await ctx.db.insert("workspaces", {
      name,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("members", {
      workspaceId,
      userId: user._id,
      role: "admin",
    });

    return workspaceId;
  },
});

export const rename = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.workspaceId);
    const name = validateWorkspaceName(args.name);
    await ctx.db.patch(args.workspaceId,{ name});
  },
})

 
export const removeMember = mutation({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.workspaceId);
    const target = await ctx.db.get(args.memberId);
    if(!target) throw new Error("Member not found");
    if (target.workspaceId.toString() !== args.workspaceId.toString())
      throw new Error("Member does not belong to this workspace");
    if (target.userId.toString() === user._id.toString()) {
      const adminCount = (await ctx.db
        .query("members")
        .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect()).filter((m) => m.role === "admin").length;
      if (adminCount <= 1) throw new Error("Cannot remove the only admin");
    }
    await ctx.db.delete(args.memberId);
  },
});
    
export const changeMemberRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.workspaceId);
    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found");
    if (target.workspaceId.toString() !== args.workspaceId.toString())
      throw new Error("Member does not belong to this workspace");
    if (target.userId.toString() === user._id.toString() && args.role === "member") {
      const adminCount = (await ctx.db
        .query("members")
        .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect()).filter((m) => m.role === "admin").length;
      if (adminCount <= 1) throw new Error("Cannot demote the only admin");
    }
    await ctx.db.patch(args.memberId, { role: args.role });
  },
});
 
 
export const deleteWorkspace = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
 
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
 
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId.toString() !== user._id.toString())
      throw new Error("Only the workspace owner can delete it");
 
    // Delete all members
    const members = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    await Promise.all(members.map((m) => ctx.db.delete(m._id)));
 
    // Delete all tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    await Promise.all(tasks.map((t) => ctx.db.delete(t._id)));
 
    // Delete all invites
    const invites = await ctx.db
      .query("invites")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    await Promise.all(invites.map((i) => ctx.db.delete(i._id)));
 
    await ctx.db.delete(args.workspaceId);
  },
});
 