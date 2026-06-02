import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { listAllProjects, listProjectsByOwner, listUsers, publicUser } from "@/lib/repo";
import { ProgressBar } from "@/components/ProgressBar";
import type { Project as ProjectType, PublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
};

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export default async function DashboardPage() {
  const session = (await getSession())!;
  await connectDB();

  if (session.role === "member") {
    const projects = (await listProjectsByOwner(session.sub)) as unknown as ProjectType[];
    const overall = avg(projects.map((p) => p.completionRate));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {session.name}</h1>
          <p className="text-slate-500">Here is the progress on your projects.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Projects" value={String(projects.length)} />
          <StatCard label="Avg. completion" value={`${overall}%`} />
          <StatCard
            label="Completed"
            value={String(projects.filter((p) => p.completionRate >= 100).length)}
          />
        </div>

        <div className="grid gap-3">
          {projects.length === 0 ? (
            <p className="text-slate-500">No projects yet. Add some on the My Projects page.</p>
          ) : (
            projects.map((p) => (
              <div key={p._id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-800">{p.title}</span>
                  <span className="text-xs text-slate-500">{STATUS_LABELS[p.status]}</span>
                </div>
                <ProgressBar value={p.completionRate} />
                <div className="text-right text-sm text-slate-500 mt-1">{p.completionRate}%</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Admin view: all members' progress grouped by member.
  const members = (await listUsers())
    .map(publicUser)
    .sort((a, b) => a.name.localeCompare(b.name)) as unknown as PublicUser[];
  const projects = (await listAllProjects()) as unknown as ProjectType[];

  const byOwner = new Map<string, ProjectType[]>();
  for (const p of projects) {
    const key = String(p.owner);
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key)!.push(p);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team Dashboard</h1>
        <p className="text-slate-500">Progress across every member&apos;s projects.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Members" value={String(members.length)} />
        <StatCard label="Total projects" value={String(projects.length)} />
        <StatCard label="Avg. completion" value={`${avg(projects.map((p) => p.completionRate))}%`} />
        <StatCard label="Completed" value={String(projects.filter((p) => p.completionRate >= 100).length)} />
      </div>

      <div className="grid gap-5">
        {members.map((m) => {
          const own = byOwner.get(m._id) || [];
          return (
            <div key={m._id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <a href={`/u/${m._id}`} className="font-semibold text-slate-900 hover:text-brand-600 hover:underline">
                    {m.name}
                  </a>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                    {m.role}
                  </span>
                </div>
                <span className="text-sm text-slate-500">
                  {own.length} project{own.length === 1 ? "" : "s"} &middot; avg{" "}
                  {avg(own.map((p) => p.completionRate))}%
                </span>
              </div>
              {own.length === 0 ? (
                <p className="text-sm text-slate-400">No projects yet.</p>
              ) : (
                <div className="space-y-3">
                  {own.map((p) => (
                    <div key={p._id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{p.title}</span>
                        <span className="text-slate-500">{p.completionRate}%</span>
                      </div>
                      <ProgressBar value={p.completionRate} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
