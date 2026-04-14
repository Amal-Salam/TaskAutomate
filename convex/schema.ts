/* eslint-disable prettier/prettier */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const inventoryItem = v.object({
  name: v.string(),
  status: v.union(
    v.literal("available"),
    v.literal("low_stock"),
    v.literal("ordered"),
    v.literal("in_transit"),
    v.literal("not_available")
  ),
  quantity: v.optional(v.number()),
  expectedDate: v.optional(v.number()), // timestamp — when item will arrive
  notes: v.optional(v.string()),
});

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
  })
    .index("byWorkspace", ["workspaceId"])
    .index("byUser", ["userId"]),

  invites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    token: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    invitedBy: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("byToken", ["token"])
    .index("byWorkspace", ["workspaceId"])
    .index("byEmail", ["email"]),
    
  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    iddSuggested: v.optional(v.number()),
    aiReason: v.optional(v.string()),       // ← new: stores AI's reasoning for due date
    storyPoints: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
    inventoryItems: v.optional(v.array(inventoryItem)),
    inventoryBlocked: v.optional(v.boolean()),
    parentGoal: v.optional(v.string()),
    isDecomposed: v.optional(v.boolean()),
  }).index("byWorkspace", ["workspaceId"]),

  taskHistory: defineTable({
    taskId:      v.id("tasks"),
    workspaceId: v.id("workspaces"),
    changedBy:   v.id("users"),
    fromStatus:  v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    toStatus:    v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    changedAt:   v.number(),
    storyPoints: v.optional(v.number()),
  })
    .index("byTask",      ["taskId"])
    .index("byWorkspace", ["workspaceId"])
    .index("byChangedAt", ["workspaceId", "changedAt"]),
 
  velocitySnapshots: defineTable({
    workspaceId:     v.id("workspaces"),
    date:            v.string(),
    pointsCompleted: v.number(),
    tasksCompleted:  v.number(),
    totalTasks:      v.number(),
    totalPoints:     v.number(),
  })
    .index("byWorkspace",     ["workspaceId"])
    .index("byWorkspaceDate", ["workspaceId", "date"]),
 
  sprints: defineTable({
    workspaceId: v.id("workspaces"),
    name:        v.string(),
    startDate:   v.number(),
    endDate:     v.number(),
    status:      v.union(v.literal("active"), v.literal("completed"), v.literal("planned")),
    createdBy:   v.id("users"),
    createdAt:   v.number(),
    retrospective: v.optional(v.object({
      generatedAt:     v.number(),
      summary:         v.string(),
      wentWell:        v.array(v.string()),
      wentPoorly:      v.array(v.string()),
      aiVsActual:      v.string(),
      recommendations: v.array(v.string()),
    })),
  })
    .index("byWorkspace", ["workspaceId"])
    .index("byStatus",    ["workspaceId", "status"]),
});

