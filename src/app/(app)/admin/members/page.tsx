"use client";

import { useEffect, useState } from "react";

type Member = {
  _id: string;
  name: string;
  email: string;
  username: string | null;
  role: "admin" | "member";
  projectCount?: number;
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", role: "member" as "admin" | "member" });

  async function load() {
    const res = await fetch("/api/admin/members");
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create member");
      return;
    }
    setForm({ name: "", email: "", username: "", password: "", role: "member" });
    load();
  }

  async function changeRole(m: Member) {
    const role = m.role === "admin" ? "member" : "admin";
    const res = await fetch(`/api/admin/members/${m._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not change role");
      return;
    }
    setMembers((prev) => prev.map((x) => (x._id === m._id ? { ...x, role } : x)));
  }

  async function resetPassword(m: Member) {
    const password = window.prompt(`New password for ${m.name} (min 6 characters):`);
    if (!password) return;
    const res = await fetch(`/api/admin/members/${m._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not reset password");
    else setError("");
  }

  async function remove(m: Member) {
    if (!window.confirm(`Delete ${m.name}? This also removes their projects and messages.`)) return;
    const res = await fetch(`/api/admin/members/${m._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not delete member");
      return;
    }
    setMembers((prev) => prev.filter((x) => x._id !== m._id));
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Member Management</h1>
        <p className="text-slate-500">Add teammates, set roles, reset passwords, or remove accounts.</p>
      </div>

      <form onSubmit={createMember} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-3">Add a member</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Full name"
            className={inputClass}
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            type="email"
            placeholder="Email"
            className={inputClass}
          />
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Username (optional)"
            className={inputClass}
          />
          <input
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            type="text"
            placeholder="Temporary password"
            className={inputClass}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}
            className={inputClass}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button className="mt-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg px-4 py-2 transition">
          Create account
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-slate-500 p-5">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Login</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Projects</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    <a href={`/u/${m._id}`} className="hover:text-brand-600 hover:underline">
                      {m.name}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {m.username ? <span className="text-slate-700">@{m.username}</span> : null}
                    <div className="text-xs text-slate-400">{m.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        m.role === "admin" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{m.projectCount ?? 0}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => changeRole(m)} className="text-brand-600 hover:underline">
                        {m.role === "admin" ? "Make member" : "Make admin"}
                      </button>
                      <button onClick={() => resetPassword(m)} className="text-slate-500 hover:underline">
                        Reset password
                      </button>
                      <button onClick={() => remove(m)} className="text-red-500 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
