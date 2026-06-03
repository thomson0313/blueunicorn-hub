"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ActionButton } from "@/components/ActionButton";
import { useApp } from "@/components/AppProvider";
import { timeAgo } from "@/lib/time-ago";
import type { ProjectComment } from "@/lib/types";

const REACTIONS = ["👍", "❤️", "😄", "🎉", "🔥"] as const;

export function ProjectCommentsPanel({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/comments`);
    const data = await res.json();
    if (res.ok) setComments(data.comments || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function postComment(body: string, parentId?: string | null) {
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentId: parentId ?? null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not post comment");
    await load();
  }

  async function handleNewComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      await postComment(newBody.trim());
      setNewBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[320px] border-l border-slate-200 pl-6">
      <h3 className="font-semibold text-slate-900 mb-3">Comments</h3>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet. Start the discussion.</p>
          ) : (
            comments.map((c) => (
              <CommentNode key={c._id} comment={c} projectId={projectId} onPost={postComment} onRefresh={load} depth={0} />
            ))
          )}
        </div>
      )}
      <form onSubmit={handleNewComment} className="mt-4 pt-3 border-t border-slate-200 shrink-0">
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          rows={2}
          placeholder="Write a comment..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <ActionButton
          type="submit"
          className="mt-2 !px-4 !py-1.5 text-sm"
          loading={posting}
          loadingText="Posting..."
          disabled={!newBody.trim()}
        >
          Post comment
        </ActionButton>
      </form>
    </div>
  );
}

function CommentNode({
  comment,
  projectId,
  onPost,
  onRefresh,
  depth,
}: {
  comment: ProjectComment;
  projectId: string;
  onPost: (body: string, parentId?: string | null) => Promise<void>;
  onRefresh: () => Promise<void>;
  depth: number;
}) {
  const { user } = useApp();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [busy, setBusy] = useState(false);

  const isAuthor = user.sub === comment.author._id;
  const canEdit = isAuthor || user.role === "admin";

  const groupedReactions = comment.reactions.reduce(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false, users: [] as string[] };
      acc[r.emoji].count += 1;
      if (r.userId === user.sub) acc[r.emoji].mine = true;
      acc[r.emoji].users.push(r.userName);
      return acc;
    },
    {} as Record<string, { count: number; mine: boolean; users: string[] }>
  );

  async function saveEdit() {
    if (!editBody.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments/${comment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not save");
      }
      setEditing(false);
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/comments/${comment._id}`, { method: "DELETE" });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleReaction(emoji: string) {
    await fetch(`/api/projects/${projectId}/comments/${comment._id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    await onRefresh();
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || busy) return;
    setBusy(true);
    try {
      await onPost(replyBody.trim(), comment._id);
      setReplyBody("");
      setReplyOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={depth > 0 ? "ml-6 pl-3 border-l-2 border-slate-100" : ""}>
      <div className="flex gap-2">
        <Avatar name={comment.author.name} src={comment.author.avatarUrl} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{comment.author.name}</span>
            <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-slate-400">(edited)</span>
            )}
          </div>
          {editing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <ActionButton type="button" className="!px-3 !py-1 text-xs" loading={busy} onClick={() => void saveEdit()}>
                  Save
                </ActionButton>
                <ActionButton type="button" variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </ActionButton>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{comment.body}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {REACTIONS.map((emoji) => {
              const g = groupedReactions[emoji];
              return (
                <button
                  key={emoji}
                  type="button"
                  title={g?.users.join(", ")}
                  onClick={() => void toggleReaction(emoji)}
                  className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition ${
                    g?.mine ? "bg-brand-50 border-brand-300" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {emoji}
                  {g?.count ? ` ${g.count}` : ""}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="text-xs text-brand-600 hover:underline cursor-pointer"
            >
              Reply
            </button>
            {canEdit && !editing && (
              <>
                <button type="button" onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:underline cursor-pointer">
                  Edit
                </button>
                <button type="button" onClick={() => void remove()} className="text-xs text-red-500 hover:underline cursor-pointer">
                  Delete
                </button>
              </>
            )}
          </div>
          {replyOpen && (
            <form onSubmit={submitReply} className="mt-2">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <ActionButton type="submit" className="mt-1 !px-3 !py-1 text-xs" loading={busy} disabled={!replyBody.trim()}>
                Reply
              </ActionButton>
            </form>
          )}
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((r) => (
            <CommentNode key={r._id} comment={r} projectId={projectId} onPost={onPost} onRefresh={onRefresh} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
