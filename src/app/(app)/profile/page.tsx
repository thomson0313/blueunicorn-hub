"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/AppProvider";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { setAvatarUrl } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
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
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("Saving...");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, skills, bio }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("");
      setError(data.error || "Could not save");
      return;
    }
    setProfile(data.profile);
    setStatus("Saved");
    router.refresh();
    setTimeout(() => setStatus(""), 2000);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("Uploading photo...");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setStatus("");
      setError(data.error || "Upload failed");
      return;
    }
    setProfile(data.profile);
    setAvatarUrl(data.profile.avatarUrl ?? null);
    setStatus("Photo updated");
    router.refresh();
    setTimeout(() => setStatus(""), 2000);
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500";

  if (!profile) return <p className="text-slate-500">Loading...</p>;

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
              onClick={() => fileRef.current?.click()}
              className="mt-2 text-sm font-medium text-brand-600 hover:underline"
            >
              Change photo
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
          <button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg px-5 py-2 transition">
            Save changes
          </button>
          {status && <span className="text-sm text-slate-500">{status}</span>}
        </div>
      </form>
    </div>
  );
}
