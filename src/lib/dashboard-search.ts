import { PROJECT_STATUS_LABELS } from "@/lib/project-rules";
import type { Project, PublicUser } from "@/lib/types";

export type SearchResultType = "project" | "member" | "field" | "alert";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function matches(needle: string, ...parts: (string | null | undefined)[]): boolean {
  if (!needle) return false;
  return parts.some((p) => p?.toLowerCase().includes(needle));
}

function ownerName(owner: Project["owner"]): string {
  return typeof owner === "string" ? "" : owner.name;
}

export function searchProjects(
  projects: Project[],
  needle: string,
  projectsHref: string,
  limit = 12
): SearchResult[] {
  return projects
    .filter((p) =>
      matches(
        needle,
        p.title,
        p.description,
        p.fieldName,
        p.budget,
        p.status,
        PROJECT_STATUS_LABELS[p.status],
        ownerName(p.owner)
      )
    )
    .slice(0, limit)
    .map((p) => ({
      type: "project" as const,
      id: p._id,
      title: p.title,
      subtitle: [
        p.fieldName,
        PROJECT_STATUS_LABELS[p.status],
        ownerName(p.owner) || undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `${projectsHref}#${p._id}`,
    }));
}

export function searchMembers(members: PublicUser[], needle: string, limit = 8): SearchResult[] {
  return members
    .filter((m) =>
      matches(needle, m.name, m.email, m.username ?? undefined, m.fieldName ?? undefined, m.skills, m.bio)
    )
    .slice(0, limit)
    .map((m) => ({
      type: "member" as const,
      id: m._id,
      title: m.name,
      subtitle: [m.fieldName, m.email, m.role].filter(Boolean).join(" · "),
      href: `/u/${m._id}`,
    }));
}

export function searchFields(
  fields: { _id: string; name: string }[],
  needle: string,
  limit = 8
): SearchResult[] {
  return fields
    .filter((f) => matches(needle, f.name))
    .slice(0, limit)
    .map((f) => ({
      type: "field" as const,
      id: f._id,
      title: f.name,
      subtitle: "Add-on field",
      href: "/admin/fields",
    }));
}

export function searchAlerts(
  alerts: { _id: string; title: string; content: string; status: string }[],
  needle: string,
  limit = 8
): SearchResult[] {
  return alerts
    .filter((a) => matches(needle, a.title, a.content, a.status))
    .slice(0, limit)
    .map((a) => ({
      type: "alert" as const,
      id: a._id,
      title: a.title,
      subtitle: `${a.status} · ${a.content.slice(0, 80)}${a.content.length > 80 ? "…" : ""}`,
      href: "/admin/alerts",
    }));
}

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  project: "Projects",
  member: "Members",
  field: "Fields",
  alert: "Alerts",
};
