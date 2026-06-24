/**
 * React hook for Nora chat session management.
 *
 * Wraps Convex queries/mutations for session CRUD
 * and provides date-grouped session list for the side nav.
 */
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useMemo } from "react";

interface NoraChatSession {
  _id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  thinkingMode?: string;
}

interface DateGroupedSessions {
  label: string;
  sessions: NoraChatSession[];
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= sevenDaysAgo) return "Previous 7 Days";
  if (date >= thirtyDaysAgo) return "Previous 30 Days";
  return "Older";
}

export const useNoraSessions = () => {
  const rawSessions = useQuery(api.noraSessions.listSessions);
  const createSessionMutation = useMutation(api.noraSessions.createSession);
  const deleteSessionMutation = useMutation(api.noraSessions.deleteSession);
  const renameSessionMutation = useMutation(
    api.noraSessions.updateSessionTitle,
  );
  const generateTitle = useAction(api.noraSessions.generateSessionTitle);

  const isLoading = rawSessions === undefined;

  const sessions: NoraChatSession[] = useMemo(
    () =>
      (rawSessions ?? []).map((s) => ({
        _id: s._id,
        title: s.title,
        lastMessageAt: s.lastMessageAt,
        messageCount: s.messageCount ?? 0,
        thinkingMode: s.thinkingMode,
      })),
    [rawSessions],
  );

  const groupedSessions: DateGroupedSessions[] = useMemo(() => {
    const groups: Record<string, NoraChatSession[]> = {};
    const order = [
      "Today",
      "Yesterday",
      "Previous 7 Days",
      "Previous 30 Days",
      "Older",
    ];

    for (const session of sessions) {
      const group = getDateGroup(session.lastMessageAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(session);
    }

    return order
      .filter((label) => groups[label]?.length > 0)
      .map((label) => ({ label, sessions: groups[label] }));
  }, [sessions]);

  const createSession = useCallback(
    async (title?: string) => {
      return await createSessionMutation({ title });
    },
    [createSessionMutation],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSessionMutation({
        sessionId: sessionId as Id<"noraChatSessions">,
      });
    },
    [deleteSessionMutation],
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      await renameSessionMutation({
        sessionId: sessionId as Id<"noraChatSessions">,
        title,
      });
    },
    [renameSessionMutation],
  );

  const requestTitleGeneration = useCallback(
    async (sessionId: string) => {
      try {
        await generateTitle({
          sessionId: sessionId as Id<"noraChatSessions">,
        });
      } catch (e) {
        // Failed to generate session title
      }
    },
    [generateTitle],
  );

  return {
    sessions,
    groupedSessions,
    isLoading,
    createSession,
    deleteSession,
    renameSession,
    requestTitleGeneration,
  };
};

/** Hook to get messages for a specific session */
export const useNoraSessionMessages = (sessionId: string | null) => {
  const messages = useQuery(
    api.noraSessions.getSessionMessages,
    sessionId ? { sessionId: sessionId as Id<"noraChatSessions"> } : "skip",
  );

  return {
    messages: messages ?? [],
    isLoading: messages === undefined,
  };
};
