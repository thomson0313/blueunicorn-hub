"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/types";

export function CreateChannelModal({
  users,
  onClose,
  onCreated,
}: {
  users: PublicUser[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          visibility,
          memberIds: visibility === "private" ? memberIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create channel");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30 cursor-pointer" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={(e) => void submit(e)}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4"
      >
        <h3 className="text-lg font-semibold text-slate-900">Create channel</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. design-team"
          />
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            Public
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            Private
          </label>
        </div>
        {visibility === "private" && (
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
            {users.map((u) => (
              <label key={u._id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberIds.includes(u._id)}
                  onChange={(e) =>
                    setMemberIds((prev) =>
                      e.target.checked ? [...prev, u._id] : prev.filter((id) => id !== u._id)
                    )
                  }
                />
                {u.name}
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || (visibility === "private" && memberIds.length === 0)}
            className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
