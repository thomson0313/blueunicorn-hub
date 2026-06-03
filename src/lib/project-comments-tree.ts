import type { ProjectComment } from "@/lib/types";
import type { EnrichedProjectComment } from "@/lib/repo";

export function buildCommentTree(flat: EnrichedProjectComment[]): ProjectComment[] {
  const map = new Map<string, ProjectComment>();
  const roots: ProjectComment[] = [];

  for (const c of flat) {
    map.set(c._id, {
      _id: c._id,
      projectId: c.projectId,
      parentId: c.parentId,
      body: c.body,
      author: c.author,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      reactions: c.reactions,
      replies: [],
    });
  }

  for (const c of flat) {
    const node = map.get(c._id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
