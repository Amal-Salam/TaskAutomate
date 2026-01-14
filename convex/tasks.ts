/* eslint-disable prettier/prettier */
import { query } from "./_generated/server.js";
// import { auth } from "./_generated/server";
import { v } from 'convex/values';

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    // ensure membership
    const me = await ctx.db
      .query("members")
      .withIndex("byWorkspace", q => q.eq("workspaceId", args.workspaceId))
      .filter(q => q.eq(q.field("userId"), identity.tokenIdentifier))
      .first();
    if (!me) throw new Error("Forbidden");
    return ctx.db
      .query("tasks")
      .withIndex("byWorkspace", q => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});