/** Socket.IO needs the custom Node server; Vercel serverless uses HTTP polling instead. */
export type RealtimeMode = "socket" | "polling";

export function getRealtimeMode(): RealtimeMode {
  if (process.env.NEXT_PUBLIC_REALTIME_MODE === "polling") return "polling";
  if (process.env.NEXT_PUBLIC_REALTIME_MODE === "socket") return "socket";
  return process.env.VERCEL ? "polling" : "socket";
}
