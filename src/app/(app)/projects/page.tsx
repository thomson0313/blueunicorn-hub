"use client";

import { useEffect, useState, useCallback } from "react";
import type { Project } from "@/lib/types";
import { ProgressBar } from "@/components/ProgressBar";

const STATUS_LABELS: Record<Project["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create project");
      return;
    }
    setTitle("");
    setDescription("");
    setProjects((prev) => [data.project, ...prev]);
  }

  async function updateProject(id: string, patch: Partial<Project>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) {
      setProjects((prev) => prev.map((p) => (p._id === id ? data.project : p)));
    }
  }

  async function removeProject(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) setProjects((prev) => prev.filter((p) => p._id !== id));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
        <p className="text-slate-500">Track what you are working on and your completion progress.</p>
      </div>

      <form onSubmit={createProject} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">Add a project</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Project title"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-4 py-2 transition">
          Add project
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-slate-500">No projects yet. Add your first one above.</p>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div key={p._id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  {p.description && <p className="text-sm text-slate-500 mt-0.5">{p.description}</p>}
                </div>
                <button
                  onClick={() => removeProject(p._id)}
                  className="text-sm text-slate-400 hover:text-red-600 transition"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <select
                  value={p.status}
                  onChange={(e) => updateProject(p._id, { status: e.target.value as Project["status"] })}
                  className="text-sm rounded-lg border border-slate-300 px-2 py-1.5"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">Completion</span>
                  <span className="font-semibold text-slate-800">{p.completionRate}%</span>
                </div>
                <ProgressBar value={p.completionRate} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={p.completionRate}
                  onChange={(e) =>
                    setProjects((prev) =>
                      prev.map((x) => (x._id === p._id ? { ...x, completionRate: Number(e.target.value) } : x))
                    )
                  }
                  onMouseUp={(e) => updateProject(p._id, { completionRate: Number((e.target as HTMLInputElement).value) })}
                  onTouchEnd={(e) => updateProject(p._id, { completionRate: Number((e.target as HTMLInputElement).value) })}
                  className="w-full mt-2 accent-brand-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
