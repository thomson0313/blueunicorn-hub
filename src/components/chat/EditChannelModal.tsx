"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

export function EditChannelModal({
  channelId,
  initialName,
  isGeneral,
  onClose,
  onSaved,
}: {
  channelId: string | null;
  initialName: string;
  isGeneral?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isGeneral) {
      onClose();
      return;
    }
    if (!channelId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update channel");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit channel">
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {isGeneral ? (
          <p className="text-sm text-slate-600">
            The General channel name is fixed and cannot be renamed.
          </p>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Channel name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
              autoFocus
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          {!isGeneral && (
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
