/* eslint-disable prettier/prettier */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
 
    const memberships = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
 
    const users = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        if (!user) return null;
        return {
          userId: user._id.toString(),
          name: user.name ?? user.email ?? "Unknown",
          email: user.email,
          role: m.role,
        };
      })
    );
 
    return users.filter(Boolean) as {
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

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name.trim(),
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
 
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
 
    const me = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (!me || me.role !== "admin") throw new Error("Only admins can rename workspaces");
 
    await ctx.db.patch(args.workspaceId, { name: args.name.trim() });
  },
});
 
export const removeMember = mutation({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
 
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
 
    const me = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (!me || me.role !== "admin") throw new Error("Only admins can remove members");
 
    // Prevent removing yourself if you're the only admin
    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found");
 
    if (target.userId.toString() === user._id.toString()) {
      const adminCount = (
        await ctx.db
          .query("members")
          .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
          .collect()
      ).filter((m) => m.role === "admin").length;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
 
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
 
    const me = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (!me || me.role !== "admin") throw new Error("Only admins can change roles");
 
    // Prevent demoting yourself if you're the only admin
    const target = await ctx.db.get(args.memberId);
    if (!target) throw new Error("Member not found");
 
    if (
      target.userId.toString() === user._id.toString() &&
      args.role === "member"
    ) {
      const adminCount = (
        await ctx.db
          .query("members")
          .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
          .collect()
      ).filter((m) => m.role === "admin").length;
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
 