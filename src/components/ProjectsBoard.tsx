"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project, ProjectStatus, MemberField } from "@/lib/types";
import { ProgressBar } from "@/components/ProgressBar";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { Modal } from "@/components/Modal";
import { ActionButton } from "@/components/ActionButton";
import { PanelLoader } from "@/components/PanelLoader";
import { ProjectFormFields, type ProjectFormState } from "@/components/ProjectFormFields";

type Mode = "member" | "admin";

type MemberOption = { _id: string; name: string };

const STATUS_OPTIONS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "archived", label: "Archived" },
];

const emptyForm = (): ProjectFormState => ({
  title: "",
  description: "",
  fieldId: "",
  budget: "",
  timeline: "",
  assignTo: "",
  completionRate: 0,
});

function ownerName(owner: Project["owner"]): string {
  return typeof owner === "string" ? "Member" : owner.name;
}

function ownerId(owner: Project["owner"]): string {
  return typeof owner === "string" ? owner : owner._id;
}

export function ProjectsBoard({ mode }: { mode: Mode }) {
  const isAdmin = mode === "admin";
  const [projects, setProjects] = useState<Project[]>([]);
  const [fields, setFields] = useState<MemberField[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormState>(emptyForm());
  const editBaselineRef = useRef<ProjectFormState | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const patchForm = useCallback((patch: Partial<ProjectFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const canCreate =
    form.title.trim().length > 0 && !!form.fieldId && (!isAdmin || !!form.assignTo);

  const isEditDirty = useMemo(() => {
    if (!editOpen || !editBaselineRef.current) return false;
    return JSON.stringify(form) !== JSON.stringify(editBaselineRef.current);
  }, [form, editOpen]);

  const loadMeta = useCallback(async () => {
    const fieldRes = await fetch("/api/fields");
    const fieldData = await fieldRes.json();
    setFields(fieldData.fields || []);

    if (isAdmin) {
      const memRes = await fetch("/api/admin/members");
      const memData = await memRes.json();
      setMembers(
        (memData.members || []).map((m: { _id: string; name: string }) => ({
          _id: m._id,
          name: m.name,
        }))
      );
    }
  }, [isAdmin]);

  const loadProjects = useCallback(async () => {
    const params = new URLSearchParams();
    if (fieldFilter !== "all") params.set("fieldId", fieldFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (isAdmin && memberFilter !== "all") params.set("ownerId", memberFilter);

    const res = await fetch(`/api/projects?${params.toString()}`);
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }, [fieldFilter, statusFilter, memberFilter, isAdmin]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setLoading(true);
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!menuId) return;
    function onOutside(e: MouseEvent) {
      if (menuContainerRef.current?.contains(e.target as Node)) return;
      setMenuId(null);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [menuId]);

  const title = isAdmin ? "All Projects" : "My Projects";
  const subtitle = isAdmin
    ? "View and manage projects across all members."
    : "Track what you are working on and your completion progress.";

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setCreateOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    const initial: ProjectFormState = {
      title: p.title,
      description: p.description,
      fieldId: p.fieldId || "",
      budget: p.budget,
      timeline: p.timeline,
      assignTo: ownerId(p.owner),
      completionRate: p.completionRate,
    };
    setForm(initial);
    editBaselineRef.current = initial;
    setError("");
    setEditOpen(true);
    setMenuId(null);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate || savingCreate) return;
    setSavingCreate(true);
    setError("");
    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      fieldId: form.fieldId,
      budget: form.budget,
      timeline: form.timeline,
    };
    if (isAdmin) body.assignTo = form.assignTo;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create project");
        return;
      }
      setCreateOpen(false);
      await loadProjects();
    } finally {
      setSavingCreate(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !isEditDirty || savingEdit) return;
    setSavingEdit(true);
    setError("");

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      fieldId: form.fieldId,
      budget: form.budget,
      timeline: form.timeline,
    };
    if (isAdmin) body.assignTo = form.assignTo;
    else body.completionRate = form.completionRate;

    try {
      const res = await fetch(`/api/projects/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update project");
        return;
      }
      setEditOpen(false);
      setEditing(null);
      editBaselineRef.current = null;
      await loadProjects();
    } finally {
      setSavingEdit(false);
    }
  }

  async function patchStatus(id: string, status: ProjectStatus) {
    const key = `${id}:${status}`;
    setActionBusy(key);
    setMenuId(null);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    try {
      if (res.ok) await loadProjects();
    } finally {
      setActionBusy(null);
    }
  }

  async function removeProject(id: string) {
    setMenuId(null);
    if (!confirm("Delete this project permanently?")) return;
    const key = `${id}:delete`;
    setActionBusy(key);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) await loadProjects();
    setActionBusy(null);
  }

  const fieldOptions = useMemo(
    () => [{ _id: "all", name: "All fields" }, ...fields],
    [fields]
  );

  const memberOptions = useMemo(
    () => [{ _id: "all", name: "All members" }, ...members],
    [members]
  );

  function ProjectMenu({ p }: { p: Project }) {
    const open = menuId === p._id;
    return (
      <div
        data-project-menu
        className={`relative ${open ? "z-30" : ""}`}
        ref={open ? menuContainerRef : undefined}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setMenuId(open ? null : p._id);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-50"
          aria-label="Project actions"
          aria-expanded={open}
          disabled={!!actionBusy}
        >
          ⋮
        </button>
        {open && (
          <div
            className="absolute right-0 top-9 z-50 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={!!actionBusy}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-amber-700 cursor-pointer disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                void patchStatus(p._id, "canceled");
              }}
            >
              {actionBusy === `${p._id}:canceled` ? "Canceling..." : "Cancel"}
            </button>
            <button
              type="button"
              disabled={!!actionBusy}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                void patchStatus(p._id, "archived");
              }}
            >
              {actionBusy === `${p._id}:archived` ? "Archiving..." : "Archive"}
            </button>
            <button
              type="button"
              disabled={!!actionBusy}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-red-600 cursor-pointer disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                void removeProject(p._id);
              }}
            >
              {actionBusy === `${p._id}:delete` ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    );
  }

  function handleCardActivate(e: React.MouseEvent, p: Project) {
    if ((e.target as HTMLElement).closest("[data-project-menu]")) return;
    openEdit(p);
  }

  function ProjectCard({ p }: { p: Project }) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={(e) => handleCardActivate(e, p)}
        onKeyDown={(e) => e.key === "Enter" && openEdit(p)}
        className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-300 hover:shadow-sm transition cursor-pointer text-left relative"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 truncate">{p.title}</h3>
              <ProjectStatusBadge status={p.status} />
            </div>
            {isAdmin && (
              <p className="text-xs text-slate-500 mb-1">Assigned to: {ownerName(p.owner)}</p>
            )}
            {p.fieldName && <p className="text-xs text-brand-600">{p.fieldName}</p>}
          </div>
          <ProjectMenu p={p} />
        </div>
        {p.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          {p.budget && <span>Budget: {p.budget}</span>}
          {p.timeline && <span>Timeline: {p.timeline}</span>}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Progress</span>
            <span className="font-semibold">{p.completionRate}%</span>
          </div>
          <ProgressBar value={p.completionRate} />
        </div>
      </article>
    );
  }

  function ProjectRow({ p }: { p: Project }) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={(e) => handleCardActivate(e, p)}
        onKeyDown={(e) => e.key === "Enter" && openEdit(p)}
        className="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition cursor-pointer flex items-center gap-4 relative"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{p.title}</h3>
            <ProjectStatusBadge status={p.status} />
            {p.fieldName && <span className="text-xs text-brand-600">{p.fieldName}</span>}
          </div>
          {isAdmin && <p className="text-xs text-slate-500 mt-0.5">{ownerName(p.owner)}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
            {p.budget && <span>{p.budget}</span>}
            {p.timeline && <span>{p.timeline}</span>}
          </div>
        </div>
        <div className="w-32 shrink-0">
          <ProgressBar value={p.completionRate} />
          <p className="text-xs text-right text-slate-500 mt-1">{p.completionRate}%</p>
        </div>
        <ProjectMenu p={p} />
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg px-5 py-2.5 transition shrink-0 cursor-pointer"
        >
          Add project
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Grid view"
            onClick={() => setView("grid")}
            className={`p-2 rounded-lg border ${view === "grid" ? "bg-brand-50 border-brand-300 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <rect x="13" y="3" width="8" height="8" rx="1" />
              <rect x="3" y="13" width="8" height="8" rx="1" />
              <rect x="13" y="13" width="8" height="8" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            title="List view"
            onClick={() => setView("list")}
            className={`p-2 rounded-lg border ${view === "list" ? "bg-brand-50 border-brand-300 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="3" y="5" width="18" height="3" rx="1" />
              <rect x="3" y="11" width="18" height="3" rx="1" />
              <rect x="3" y="17" width="18" height="3" rx="1" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2"
          >
            {fieldOptions.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "all")}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="text-sm rounded-lg border border-slate-300 px-3 py-2"
            >
              {memberOptions.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <PanelLoader label="Loading projects..." />
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600 font-medium">No projects yet</p>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            {isAdmin
              ? "Create a project and assign it to a team member."
              : "Add your first project to start tracking progress."}
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg px-5 py-2.5"
          >
            Add project
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 overflow-visible">
          {projects.map((p) => (
            <ProjectCard key={p._id} p={p} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectRow key={p._id} p={p} />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          if (!savingCreate) setCreateOpen(false);
        }}
        title="Add project"
        wide
      >
        <form onSubmit={submitCreate} className="space-y-4">
          <ProjectFormFields
            form={form}
            onChange={patchForm}
            fields={fields}
            members={members}
            showAssign={isAdmin}
            showProgress={false}
            error={error}
          />
          <div className="flex gap-3 pt-2">
            <ActionButton
              type="submit"
              loading={savingCreate}
              loadingText="Creating..."
              disabled={!canCreate}
            >
              Create project
            </ActionButton>
            <ActionButton
              type="button"
              variant="ghost"
              disabled={savingCreate}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </ActionButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => {
          if (!savingEdit) {
            setEditOpen(false);
            setEditing(null);
            editBaselineRef.current = null;
          }
        }}
        title="Edit project"
        wide
      >
        <form onSubmit={submitEdit} className="space-y-4">
          <ProjectFormFields
            form={form}
            onChange={patchForm}
            fields={fields}
            members={members}
            showAssign={isAdmin}
            showProgress={!isAdmin}
            error={error}
          />
          <div className="flex gap-3 pt-2">
            <ActionButton
              type="submit"
              loading={savingEdit}
              loadingText="Saving..."
              disabled={!isEditDirty}
            >
              Save changes
            </ActionButton>
            <ActionButton
              type="button"
              variant="ghost"
              disabled={savingEdit}
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
                editBaselineRef.current = null;
              }}
            >
              Cancel
            </ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
