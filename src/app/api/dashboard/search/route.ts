import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  listAllProjects,
  listProjectsByOwner,
  listUsers,
  listMemberFields,
  listAlerts,
  publicUser,
} from "@/lib/repo";
import {
  normalizeQuery,
  searchProjects,
  searchMembers,
  searchFields,
  searchAlerts,
  type SearchResult,
} from "@/lib/dashboard-search";
import { requireUser, handleError } from "@/lib/api-guard";
import type { Project } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const needle = normalizeQuery(searchParams.get("q") ?? "");

    if (needle.length < 2) {
      return NextResponse.json({ results: [] as SearchResult[] });
    }

    await connectDB();

    if (user.role === "admin") {
      const [projectRows, userRows, fields, alerts] = await Promise.all([
        listAllProjects(),
        listUsers(),
        listMemberFields(),
        listAlerts(),
      ]);

      const members = await Promise.all(userRows.map((u) => publicUser(u)));
      const projects = projectRows as unknown as Project[];

      const results: SearchResult[] = [
        ...searchProjects(projects, needle, "/admin/projects"),
        ...searchMembers(members, needle),
        ...searchFields(fields.map((f) => ({ _id: f._id, name: f.name })), needle),
        ...searchAlerts(
          alerts.map((a) => ({
            _id: a._id,
            title: a.title,
            content: a.content,
            status: a.status,
          })),
          needle
        ),
      ];

      return NextResponse.json({ results });
    }

    const projects = (await listProjectsByOwner(user.sub)) as unknown as Project[];
    const results = searchProjects(projects, needle, "/projects");

    return NextResponse.json({ results });
  } catch (err) {
    return handleError(err);
  }
}
