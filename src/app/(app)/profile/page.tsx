"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ActionButton } from "@/components/ActionButton";
import { PanelLoader } from "@/components/PanelLoader";
import { RequiredLabel } from "@/components/RequiredLabel";
import { AvatarCropModal } from "@/components/profile/AvatarCropModal";
import { SkillsTagInput, parseSkillsString, skillsToString } from "@/components/profile/SkillsTagInput";
import { useApp } from "@/components/AppProvider";
import type { MemberField, Profile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { setAvatarUrl } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fields, setFields] = useState<MemberField[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/profile"), fetch("/api/fields")])
      .then(async ([pRes, fRes]) => {
        const pData = await pRes.json();
        const fData = await fRes.json();
        setFields(fData.fields || []);
        if (pData.profile) {
          const p = pData.profile as Profile;
          setProfile(p);
          setName(p.name);
          setEmail(p.email);
          setUsername(p.username || "");
          setFieldId(p.fieldId || "");
          setSkillTags(parseSkillsString(p.skills || ""));
          setBio(p.bio || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const profileDirty =
    !!profile &&
    (name !== profile.name ||
      email !== profile.email ||
      (username || "") !== (profile.username || "") ||
      fieldId !== (profile.fieldId || "") ||
      skillsToString(skillTags) !== (profile.skills || "") ||
      bio !== (profile.bio || ""));

  const passwordDirty = !!newPassword || !!currentPassword || !!confirmPassword;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileDirty || saving) return;
    if (passwordDirty) {
      setError("Use the password section below to change your password.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          username: username.trim() || null,
          fieldId,
          skills: skillsToString(skillTags),
          bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setProfile(data.profile);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || saving) return;
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    } finally {
      setSaving(false);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  }

  async function uploadCropped(blob: Blob) {
    setCropOpen(false);
    setCropFile(null);
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
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
          <Avatar name={profile.name} src={profile.avatarUrl} size={88} bordered />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 uppercase">
                {profile.role}
              </span>
            </div>
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
              onChange={onFileSelect}
            />
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Account</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="letters, numbers, underscores"
            className={inputClass}
          />
        </div>
        <div>
          <RequiredLabel>Field</RequiredLabel>
          <select
            required
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a field</option>
            {fields.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
          <SkillsTagInput tags={skillTags} onChange={setSkillTags} />
          <p className="text-xs text-slate-400 mt-1">Type a skill and press Enter to add.</p>
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
        <ActionButton type="submit" loading={saving} loadingText="Saving..." disabled={!profileDirty}>
          Save changes
        </ActionButton>
      </form>

      <form onSubmit={savePassword} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Password</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <ActionButton
          type="submit"
          loading={saving}
          loadingText="Updating..."
          disabled={!newPassword || !currentPassword}
        >
          Update password
        </ActionButton>
      </form>

      <AvatarCropModal
        open={cropOpen}
        file={cropFile}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onConfirm={uploadCropped}
      />
    </div>
  );
}
