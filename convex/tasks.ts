import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) return null;
    return task;
  },
});

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", args.status),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    subject: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Give the task a name");

    // `subject` is what the app has always called it (it drives the brain map
    // and the pre-session picker); `category` is the legacy column. Keep both
    // in step so neither read path comes back empty.
    const subject = args.subject ?? args.category;

    return await ctx.db.insert("tasks", {
      userId: user._id,
      title,
      description: args.description,
      priority: args.priority ?? "medium",
      status: "pending",
      subject,
      category: subject,
      estimatedMinutes: args.estimatedMinutes,
      dueDate: args.dueDate,
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    subject: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    completedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const { taskId, ...updates } = args;
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    // Keep subject/category mirrored whichever one the caller sent.
    if (updates.subject !== undefined) cleanUpdates.category = updates.subject;
    else if (updates.category !== undefined) {
      cleanUpdates.subject = updates.category;
    }

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(taskId, cleanUpdates);
    }
  },
});

export const toggleComplete = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Validate that the task belongs to the current user
    if (task.userId !== user._id) {
      throw new Error("Not authorized to modify this task");
    }

    const isCompleted = task.status === "completed";
    await ctx.db.patch(args.taskId, {
      status: isCompleted ? "pending" : "completed",
      completedAt: isCompleted ? undefined : new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Validate that the task belongs to the current user
    if (task.userId !== user._id) {
      throw new Error("Not authorized to delete this task");
    }

    // Delete subtasks first
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const st of subtasks) {
      await ctx.db.delete(st._id);
    }
    await ctx.db.delete(args.taskId);
  },
});
