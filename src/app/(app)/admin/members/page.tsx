"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PanelLoader } from "@/components/PanelLoader";
import type { MemberField } from "@/lib/types";
import type { ApprovalStatus } from "@/lib/user-approval";
import { APPROVAL_LABELS } from "@/lib/user-approval";

type Member = {
  _id: string;
  name: string;
  email: string;
  username: string | null;
  role: "admin" | "member";
  avatarUrl?: string | null;
  fieldId?: string | null;
  fieldName?: string | null;
  approvalStatus?: ApprovalStatus;
  projectCount?: number;
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [fields, setFields] = useState<MemberField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldBusy, setFieldBusy] = useState<string | null>(null);
  const [permissionBusy, setPermissionBusy] = useState<string | null>(null);

  async function load() {
    const [memRes, fieldRes] = await Promise.all([
      fetch("/api/admin/members"),
      fetch("/api/fields"),
    ]);
    const memData = await memRes.json();
    const fieldData = await fieldRes.json();
    setMembers(memData.members || []);
    setFields(fieldData.fields || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

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
    setError("");
    setMembers((prev) => prev.map((x) => (x._id === m._id ? { ...x, role } : x)));
  }

  async function changeField(m: Member, fieldId: string) {
    const nextFieldId = fieldId || null;
    setFieldBusy(m._id);
    setError("");
    const res = await fetch(`/api/admin/members/${m._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldId: nextFieldId }),
    });
    const data = await res.json();
    setFieldBusy(null);
    if (!res.ok) {
      setError(data.error || "Could not update field");
      return;
    }
    const fieldName = fields.find((f) => f._id === nextFieldId)?.name ?? null;
    setMembers((prev) =>
      prev.map((x) =>
        x._id === m._id ? { ...x, fieldId: nextFieldId, fieldName } : x
      )
    );
  }

  async function changePermission(m: Member, approvalStatus: "accepted" | "rejected") {
    setPermissionBusy(m._id);
    setError("");
    const res = await fetch(`/api/admin/members/${m._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus }),
    });
    const data = await res.json();
    setPermissionBusy(null);
    if (!res.ok) {
      setError(data.error || "Could not update permission");
      return;
    }
    setMembers((prev) =>
      prev.map((x) => (x._id === m._id ? { ...x, approvalStatus } : x))
    );
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

  const selectClass =
    "text-sm rounded-lg border border-slate-300 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:opacity-50";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Member Management</h1>
        <p className="text-slate-500">
          Approve new registrations, set roles, assign fields, reset passwords, or remove accounts.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <PanelLoader label="Loading members..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Login</th>
                  <th className="px-5 py-3 font-medium">Field</th>
                  <th className="px-5 py-3 font-medium">Permission</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Projects</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      <a href={`/u/${m._id}`} className="flex items-center gap-2 hover:text-brand-600">
                        <Avatar name={m.name} src={m.avatarUrl} size={32} />
                        <span className="hover:underline">{m.name}</span>
                      </a>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {m.username ? <span className="text-slate-700">@{m.username}</span> : null}
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={m.fieldId ?? ""}
                        disabled={fieldBusy === m._id}
                        onChange={(e) => void changeField(m, e.target.value)}
                        className={selectClass}
                      >
                        <option value="">No field</option>
                        {fields.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      {m.role === "admin" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <select
                          value={
                            m.approvalStatus === "accepted" || m.approvalStatus === "rejected"
                              ? m.approvalStatus
                              : ""
                          }
                          disabled={permissionBusy === m._id}
                          onChange={(e) => {
                            const v = e.target.value as "accepted" | "rejected";
                            if (v) void changePermission(m, v);
                          }}
                          className={selectClass}
                        >
                          {m.approvalStatus === "pending" && (
                            <option value="" disabled>
                              {APPROVAL_LABELS.pending}
                            </option>
                          )}
                          <option value="accepted">Accept</option>
                          <option value="rejected">Reject</option>
                        </select>
                      )}
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
          </div>
        )}
      </div>
    </div>
  );
}
