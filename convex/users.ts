/* eslint-disable prettier/prettier */
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Helper: auto-accept any pending invites for this email ──────────────────
async function autoAcceptPendingInvites(ctx: any, userId: any, email: string) {
  const normalised = email.trim().toLowerCase();
 
  const pendingInvites = await ctx.db
    .query("invites")
    .withIndex("byEmail", (q: any) => q.eq("email", normalised))
    .collect();
 
  const validInvites = pendingInvites.filter(
    (inv: any) => inv.status === "pending" && inv.expiresAt > Date.now()
  );
 
  for (const invite of validInvites) {
    // Check they're not already a member (shouldn't be, but guard anyway)
    const alreadyMember = await ctx.db
      .query("members")
      .withIndex("byWorkspace", (q: any) => q.eq("workspaceId", invite.workspaceId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .first();
 
    if (!alreadyMember) {
      await ctx.db.insert("members", {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      });
    }
 
    // Mark invite accepted
    await ctx.db.patch(invite._id, { status: "accepted" });
  }
}
 

// Called by the Clerk webhook — internal so it can't be called from the browser
export const upsert = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email.trim().toLowerCase(),
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
    await autoAcceptPendingInvites(ctx, userId, args.email);
    return userId;
  },
});

// Called from the browser on first load — ensures the user exists
// even if the webhook hasn't fired yet (e.g. during local development)
export const ensureExists = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("users")
      .withIndex("byClerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) return existing._id;

    return ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email?.trim().toLowerCase() ?? "",
      name: identity.name ?? undefined,
      avatarUrl: identity.profileUrl ?? undefined,
      createdAt: Date.now(),
    });
  },
});