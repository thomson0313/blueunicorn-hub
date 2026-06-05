import Link from "next/link";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { listAllProjects, listProjectsByOwner, listUsers, publicUser } from "@/lib/repo";
import {
  activeProjects,
  formatLoggedHours,
  memberSummaries,
  groupProjectsByOwner,
  summarizeProjects,
} from "@/lib/dashboard-stats";
import { DashboardMemberCard, DashboardProjectRow } from "@/components/dashboard/DashboardProjectRow";
import type { Project as ProjectType, PublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "brand" | "emerald" | "amber" | "red";
}) {
  const accents = {
    default: "border-slate-200",
    brand: "border-brand-200 bg-brand-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
    amber: "border-amber-200 bg-amber-50/40",
    red: "border-red-200 bg-red-50/40",
  };
  return (
    <div className={`bg-white rounded-xl border p-4 ${accents[accent ?? "default"]}`}>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600 font-medium">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = (await getSession())!;
  await connectDB();

  if (session.role === "member") {
    const allProjects = (await listProjectsByOwner(session.sub)) as unknown as ProjectType[];
    const projects = activeProjects(allProjects);
    const summary = summarizeProjects(allProjects);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome, {session.name}</h1>
            <p className="text-slate-500">Your active project workload and progress at a glance.</p>
          </div>
          <Link
            href="/projects"
            className="text-sm font-medium text-brand-600 hover:underline shrink-0"
          >
            View all projects →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Active projects" value={String(summary.totalActive)} />
          <StatCard
            label="In progress"
            value={String(summary.inProgress)}
            accent="brand"
          />
          <StatCard
            label="Completed"
            value={String(summary.completed)}
            accent="emerald"
          />
          <StatCard
            label={summary.hourlyCount > 0 ? "Hours logged" : "Avg. completion"}
            value={
              summary.hourlyCount > 0
                ? formatLoggedHours(summary.totalLoggedHours)
                : `${summary.fixedAvgCompletion}%`
            }
            hint={
              summary.hourlyCount > 0 && summary.fixedCount > 0
                ? `${summary.fixedCount} fixed · ${summary.fixedAvgCompletion}% avg`
                : summary.hourlyCount > 0
                  ? `${summary.hourlyCount} hourly project${summary.hourlyCount === 1 ? "" : "s"}`
                  : summary.fixedCount > 0
                    ? `${summary.fixedCount} fixed project${summary.fixedCount === 1 ? "" : "s"}`
                    : undefined
            }
          />
        </div>

        {(summary.urgent > 0 || summary.canceled > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {summary.urgent > 0 && (
              <StatCard label="Urgent" value={String(summary.urgent)} accent="red" hint="Due soon" />
            )}
            {summary.canceled > 0 && (
              <StatCard label="Canceled" value={String(summary.canceled)} accent="amber" />
            )}
            {summary.hourlyCount > 0 && summary.fixedCount > 0 && (
              <StatCard
                label="Project mix"
                value={`${summary.hourlyCount}h / ${summary.fixedCount}f`}
                hint="Hourly / fixed"
              />
            )}
          </div>
        )}

        <div className="grid gap-3">
          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-600 font-medium">No active projects</p>
              <p className="text-slate-500 text-sm mt-1">
                Add a project on the My Projects page to start tracking work.
              </p>
            </div>
          ) : (
            projects.map((p) => <DashboardProjectRow key={p._id} project={p} />)
          )}
        </div>
      </div>
    );
  }

  const memberRows = await listUsers();
  const members = (await Promise.all(memberRows.map((u) => publicUser(u)))).sort((a, b) =>
    a.name.localeCompare(b.name)
  ) as unknown as PublicUser[];
  const allProjects = (await listAllProjects()) as unknown as ProjectType[];
  const teamSummary = summarizeProjects(allProjects);
  const byOwner = groupProjectsByOwner(allProjects);
  const teamMembers = memberSummaries(members, byOwner);
  const memberCount = members.filter((m) => m.role === "member").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Dashboard</h1>
          <p className="text-slate-500">Workload, status, and progress across the team.</p>
        </div>
        <Link
          href="/admin/projects"
          className="text-sm font-medium text-brand-600 hover:underline shrink-0"
        >
          Manage projects →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Team members" value={String(memberCount)} hint={`${members.length} accounts total`} />
        <StatCard label="Active projects" value={String(teamSummary.totalActive)} />
        <StatCard
          label="In progress"
          value={String(teamSummary.inProgress)}
          accent="brand"
        />
        <StatCard
          label="Completed"
          value={String(teamSummary.completed)}
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Hourly projects"
          value={String(teamSummary.hourlyCount)}
          hint={
            teamSummary.hourlyCount > 0
              ? formatLoggedHours(teamSummary.totalLoggedHours) + " total"
              : "No hourly projects"
          }
        />
        <StatCard
          label="Fixed projects"
          value={String(teamSummary.fixedCount)}
          hint={
            teamSummary.fixedCount > 0
              ? `${teamSummary.fixedAvgCompletion}% avg completion`
              : "No fixed projects"
          }
        />
        <StatCard
          label="Urgent"
          value={String(teamSummary.urgent)}
          accent={teamSummary.urgent > 0 ? "red" : "default"}
          hint="Approaching due date"
        />
        <StatCard
          label="Canceled"
          value={String(teamSummary.canceled)}
          accent={teamSummary.canceled > 0 ? "amber" : "default"}
        />
      </div>

      <div className="grid gap-5">
        {teamMembers.map(({ member, projects, summary }) => (
          <DashboardMemberCard
            key={member._id}
            memberId={member._id}
            name={member.name}
            role={member.role}
            fieldName={member.fieldName}
            summary={summary}
            projects={projects}
          />
        ))}
      </div>
    </div>
  );
}
