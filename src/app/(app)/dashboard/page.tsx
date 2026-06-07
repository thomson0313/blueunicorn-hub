import Link from "next/link";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findUserById, listAllProjects, listProjectsByOwner, listUsers, publicUser } from "@/lib/repo";
import {
  activeProjects,
  formatLoggedHours,
  memberSummaries,
  groupProjectsByOwner,
  summarizeProjects,
} from "@/lib/dashboard-stats";
import { userDailyScore, teamAverageScore } from "@/lib/daily-score";
import { DashboardMemberCard, DashboardProjectRow } from "@/components/dashboard/DashboardProjectRow";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { ScoreAvatar } from "@/components/ScoreAvatar";
import {
  IconStatCanceled,
  IconStatCompleted,
  IconStatFixed,
  IconStatHourly,
  IconStatHours,
  IconStatMembers,
  IconStatProgress,
  IconStatProjects,
  IconStatScore,
  IconStatUrgent,
} from "@/components/icons/DashboardIcons";
import type { Project as ProjectType, PublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = (await getSession())!;
  await connectDB();

  if (session.role === "member") {
    const meUser = await findUserById(session.sub);
    const me = meUser ? await publicUser(meUser) : null;
    const allProjects = (await listProjectsByOwner(session.sub)) as unknown as ProjectType[];
    const projects = activeProjects(allProjects);
    const summary = summarizeProjects(allProjects);
    const dailyScore = userDailyScore(allProjects);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <ScoreAvatar name={session.name} src={me?.avatarUrl} size={56} score={dailyScore} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome, {session.name}</h1>
              <p className="text-slate-500">Today&apos;s score and active project workload.</p>
            </div>
          </div>
          <Link
            href="/projects"
            className="text-sm font-medium text-brand-600 hover:underline shrink-0"
          >
            View all projects →
          </Link>
        </div>

        <DashboardSearch isAdmin={false} />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <DashboardStatCard
            label="Today's score"
            value={`${dailyScore}%`}
            accent="brand"
            icon={<IconStatScore />}
          />
          <DashboardStatCard
            label="Active projects"
            value={String(summary.totalActive)}
            icon={<IconStatProjects />}
          />
          <DashboardStatCard
            label="In progress"
            value={String(summary.inProgress)}
            accent="brand"
            icon={<IconStatProgress />}
          />
          <DashboardStatCard
            label="Completed"
            value={String(summary.completed)}
            accent="emerald"
            icon={<IconStatCompleted />}
          />
          <DashboardStatCard
            label={summary.hourlyCount > 0 ? "Hours logged" : "Avg. completion"}
            value={
              summary.hourlyCount > 0
                ? formatLoggedHours(summary.totalLoggedHours)
                : `${summary.fixedAvgCompletion}%`
            }
            icon={summary.hourlyCount > 0 ? <IconStatHours /> : <IconStatFixed />}
            hint={
              summary.hourlyCount > 0 && summary.fixedCount > 0
                ? `${summary.fixedCount} fixed · ${summary.fixedAvgCompletion}% avg`
                : undefined
            }
          />
        </div>

        {(summary.urgent > 0 || summary.canceled > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {summary.urgent > 0 && (
              <DashboardStatCard
                label="Urgent"
                value={String(summary.urgent)}
                accent="red"
                hint="Due soon"
                icon={<IconStatUrgent />}
              />
            )}
            {summary.canceled > 0 && (
              <DashboardStatCard
                label="Canceled"
                value={String(summary.canceled)}
                accent="amber"
                icon={<IconStatCanceled />}
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
            projects.map((p) => (
              <DashboardProjectRow key={p._id} project={p} projectsHref="/projects" />
            ))
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

  const memberScores = teamMembers.map(({ member, projects }) => ({
    member,
    score: userDailyScore(projects),
  }));
  const avgTeamScore = teamAverageScore(memberScores.map((m) => m.score));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Dashboard</h1>
          <p className="text-slate-500">Workload, daily scores, and progress across the team.</p>
        </div>
        <Link
          href="/admin/projects"
          className="text-sm font-medium text-brand-600 hover:underline shrink-0"
        >
          Manage projects →
        </Link>
      </div>

      <DashboardSearch isAdmin />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <DashboardStatCard
          label="Team avg. score"
          value={`${avgTeamScore}%`}
          accent="brand"
          icon={<IconStatScore />}
          hint="Today's combined member scores"
        />
        <DashboardStatCard
          label="Team members"
          value={String(memberCount)}
          hint={`${members.length} accounts total`}
          icon={<IconStatMembers />}
        />
        <DashboardStatCard
          label="Active projects"
          value={String(teamSummary.totalActive)}
          icon={<IconStatProjects />}
        />
        <DashboardStatCard
          label="In progress"
          value={String(teamSummary.inProgress)}
          accent="brand"
          icon={<IconStatProgress />}
        />
        <DashboardStatCard
          label="Completed"
          value={String(teamSummary.completed)}
          accent="emerald"
          icon={<IconStatCompleted />}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DashboardStatCard
          label="Hourly projects"
          value={String(teamSummary.hourlyCount)}
          hint={
            teamSummary.hourlyCount > 0
              ? formatLoggedHours(teamSummary.totalLoggedHours) + " total"
              : "No hourly projects"
          }
          icon={<IconStatHourly />}
        />
        <DashboardStatCard
          label="Fixed projects"
          value={String(teamSummary.fixedCount)}
          hint={
            teamSummary.fixedCount > 0
              ? `${teamSummary.fixedAvgCompletion}% avg completion`
              : "No fixed projects"
          }
          icon={<IconStatFixed />}
        />
        <DashboardStatCard
          label="Urgent"
          value={String(teamSummary.urgent)}
          accent={teamSummary.urgent > 0 ? "red" : "default"}
          hint="Approaching due date"
          icon={<IconStatUrgent />}
        />
        <DashboardStatCard
          label="Canceled"
          value={String(teamSummary.canceled)}
          accent={teamSummary.canceled > 0 ? "amber" : "default"}
          icon={<IconStatCanceled />}
        />
      </div>

      <div className="grid gap-5">
        {teamMembers.map(({ member, projects, summary }) => {
          const scoreEntry = memberScores.find((s) => s.member._id === member._id);
          return (
            <DashboardMemberCard
              key={member._id}
              memberId={member._id}
              name={member.name}
              role={member.role}
              fieldName={member.fieldName}
              avatarUrl={member.avatarUrl}
              score={scoreEntry?.score ?? 0}
              summary={summary}
              projects={projects}
              projectsHref="/admin/projects"
            />
          );
        })}
      </div>
    </div>
  );
}
