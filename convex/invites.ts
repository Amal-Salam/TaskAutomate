/* eslint-disable prettier/prettier */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateEmail } from "./validators";

// ── Get invite details by token (for the accept page) ───────────────────────
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if(!args.token || args.token.length !== 32) return null;
    const invite = await ctx.db
      .query("invites")
      .withIndex("byToken", (q) => q.eq("token", args.token))
      .first();

    if (!invite) return null;

    const workspace = await ctx.db.get(invite.workspaceId);
    const inviter = await ctx.db.get(invite.invitedBy);

    return {
      status: invite.status,
      expiresAt: invite.expiresAt,
      expired: invite.expiresAt < Date.now(),
      email: invite.email,
      role: invite.role,
      workspaceName: workspace?.name ?? "Unknown workspace",
      inviterName: inviter?.name ?? inviter?.email ?? "A teammate",
    };
  },
});

// ── List pending invites for a workspace ─────────────────────────────────────
export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];
    // Only members can see invites
    const member = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (!member) return [];
    return ctx.db
      .query("invites")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// ── Accept an invite ──────────────────────────────────────────────────────────
export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    if (!args.token || args.token.length !== 32) throw new Error("Invalid invite token");
    
    const invite = await ctx.db
      .query("invites")
      .withIndex("byToken", (q) => q.eq("token", args.token))
      .first();

    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("This invite has already been used or expired");
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invite has expired");
    }

    // Enforce that the accepting user's email matches the invite email
    const userEmail = identity.email?.toLowerCase() ?? "";
    if (userEmail && invite.email && userEmail !== invite.email.toLowerCase()) {
      throw new Error(
        `This invite was sent to ${invite.email}. Please sign in with that email address to accept.`
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found — please sign in first");

    const existing = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", invite.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!existing) {
      await ctx.db.insert("members", {
        workspaceId: invite.workspaceId,
        userId: user._id,
        role: invite.role,
      });
    }

    await ctx.db.patch(invite._id, { status: "accepted" });
    return { workspaceId: invite.workspaceId };
  },
});

// ── Revoke an invite ──────────────────────────────────────────────────────────
export const revoke = mutation({
  args: { inviteId: v.id("invites"), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    // Verify caller is admin of this workspace
    const member = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (!member || member.role !== "admin") throw new Error("Only admins can revoke invites");
    // Verify invite belongs to this workspace
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.workspaceId.toString() !== args.workspaceId.toString())
      throw new Error("Invite does not belong to this workspace");
    await ctx.db.patch(args.inviteId, { status: "expired" });
  },
});

// ── Internal helpers called by sendInvite action ──────────────────────────────
export const getCallerMembership = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;
    const member = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    return member ? { ...member, userId: user._id } : null;
  },
});

export const getPendingInvite = query({
  args: { workspaceId: v.id("workspaces"), email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("invites")
      .withIndex("byWorkspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();
  },
});

export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => ctx.db.get(args.workspaceId),
});

export const createInviteRecord = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    token: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);
    return ctx.db.insert("invites", {
      ...args,
      email,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});