import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findUserById, listProjectsByOwner, publicUser } from "@/lib/repo";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getSession())!;
  await connectDB();

  const user = await findUserById(id);
  if (!user) notFound();

  const profile = await publicUser(user);
  const skills = profile.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Admins (and the owner) can see this member's project progress.
  const canSeeProjects = session.role === "admin" || session.sub === id;
  const projects = canSeeProjects ? await listProjectsByOwner(id) : [];

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/chat" className="text-sm text-brand-600 hover:underline">
        &larr; Back
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <Avatar name={profile.name} src={profile.avatarUrl} size={88} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 uppercase">
                {profile.role}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {profile.username ? `@${profile.username} · ` : ""}
              {profile.email}
              {profile.fieldName ? ` · ${profile.fieldName}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-2">Skills</h2>
        {skills.length === 0 ? (
          <p className="text-sm text-slate-400">No skills listed yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="text-sm px-3 py-1 rounded-full bg-brand-50 text-brand-700">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-2">Bio</h2>
        {profile.bio ? (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <p className="text-sm text-slate-400">No bio shared yet.</p>
        )}
      </div>

      {canSeeProjects && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Project progress</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-400">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
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
      )}
    </div>
  );
}
