import { redirect } from "next/navigation";
import { MemberWeekCalendar } from "@/components/calendar/MemberWeekCalendar";
import { requirePageSession } from "@/lib/require-page-session";

export default async function CalendarPage() {
  const session = await requirePageSession();
  if (session.role === "admin") redirect("/admin/calendar");
  return <MemberWeekCalendar />;
}
