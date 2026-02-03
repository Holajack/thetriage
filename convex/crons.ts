import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Generate daily Nora notifications at 2:00 PM UTC
crons.daily(
  "nora-daily-notifications",
  { hourUTC: 14, minuteUTC: 0 },
  internal.noraNotifications.generateNotifications
);

export default crons;
