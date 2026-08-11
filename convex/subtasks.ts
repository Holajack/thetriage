import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./users";

/**
 * Subtasks hang off a task, so ownership is checked on BOTH: you must own the
 * subtask AND its parent task. Previously update/toggleComplete/remove took an
 * id and patched or deleted it with no auth call at all — any caller could wipe
 * anyone's checklist.
 */
async function getOwnedSubtask(ctx: MutationCtx, subtaskId: Id<"subtasks">) {
  const user = await getCurrentUser(ctx);
  const subtask = await ctx.db.get(subtaskId);
  if (!subtask || subtask.userId !== user._id) {
    throw new Error("Subtask not found");
  }
  return { user, subtask };
}

async function ownsTask(
  ctx: QueryCtx,
  taskId: Id<"tasks">,
  userId: Id<"users">,
) {
  const task = await ctx.db.get(taskId);
  return Boolean(task && task.userId === userId);
}

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    // Never hand another user's checklist to someone who guesses a task id.
    if (!user || !(await ownsTask(ctx, args.taskId, user._id))) return [];

    return await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    // You may only add a subtask to your OWN task.
    if (!(await ownsTask(ctx, args.taskId, user._id))) {
      throw new Error("Task not found");
    }

    return await ctx.db.insert("subtasks", {
      taskId: args.taskId,
      userId: user._id,
      title: args.title,
      text: args.text,
      completed: false,
    });
  },
});

export const update = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { subtask } = await getOwnedSubtask(ctx, args.subtaskId);

    const { subtaskId: _id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(subtask._id, cleanUpdates);
    }
  },
});

export const toggleComplete = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const { subtask } = await getOwnedSubtask(ctx, args.subtaskId);
    await ctx.db.patch(subtask._id, { completed: !subtask.completed });
  },
});

export const remove = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const { subtask } = await getOwnedSubtask(ctx, args.subtaskId);
    await ctx.db.delete(subtask._id);
  },
});
