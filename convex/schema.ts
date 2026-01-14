/* eslint-disable prettier/prettier */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("byClerk", ["clerkId"]),

  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }),

  members: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  }).index("byWorkspace", ["workspaceId"])
    .index("byUser", ["userId"]),

  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    iddSuggested: v.optional(v.number()),
    storyPoints: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("byWorkspace", ["workspaceId"]),
});