"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ActionButton } from "@/components/ActionButton";
import { PanelLoader } from "@/components/PanelLoader";
import { useApp } from "@/components/AppProvider";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { setAvatarUrl } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setName(d.profile.name);
          setSkills(d.profile.skills || "");
          setBio(d.profile.bio || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    !!profile &&
    (name !== profile.name || skills !== (profile.skills || "") || bio !== (profile.bio || ""));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, skills, bio }),
    });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setProfile(data.profile);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setProfile(data.profile);
      setAvatarUrl(data.profile.avatarUrl ?? null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500";

  if (loading || !profile) return <PanelLoader label="Loading profile..." />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <Avatar name={profile.name} src={profile.avatarUrl} size={88} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 uppercase">
                {profile.role}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {profile.username ? `@${profile.username} · ` : ""}
              {profile.email}
              {profile.fieldName ? ` · ${profile.fieldName}` : ""}
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 text-sm font-medium text-brand-600 hover:underline cursor-pointer disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={uploadAvatar}
            />
          </div>
        </div>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. React, Node.js, UI design"
            className={inputClass}
          />
          <p className="text-xs text-slate-400 mt-1">Separate skills with commas.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="A short bio about you, your role, and what you're working on."
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <ActionButton type="submit" loading={saving} loadingText="Saving..." disabled={!isDirty}>
            Save changes
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
