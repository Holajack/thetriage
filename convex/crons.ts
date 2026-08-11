import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Generate daily Nora notifications at 2:00 PM UTC
crons.daily(
  "nora-daily-notifications",
  { hourUTC: 14, minuteUTC: 0 },
  internal.noraNotifications.generateNotifications,
);

// Close out sessions the user abandoned (force-quit, phone died). Without this
// they stay "active" forever and show up in history as 0m ghosts.
crons.interval(
  "reap-abandoned-sessions",
  { hours: 1 },
  internal.focusSessions.reapAbandonedSessions,
);

export default crons;
