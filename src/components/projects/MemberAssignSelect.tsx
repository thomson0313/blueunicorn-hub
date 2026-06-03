"use client";

import { Avatar } from "@/components/Avatar";

export type MemberOption = { _id: string; name: string; avatarUrl?: string | null };

export function MemberAssignSelect({
  value,
  members,
  onChange,
}: {
  value: string;
  members: MemberOption[];
  onChange: (id: string) => void;
}) {
  const selected = members.find((m) => m._id === value);

  return (
    <div className="space-y-2">
      <select
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Select a member</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name}
          </option>
        ))}
      </select>
      {selected && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Avatar name={selected.name} src={selected.avatarUrl} size={28} />
          <span>{selected.name}</span>
        </div>
      )}
      <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
        {members.map((m) => (
          <li key={m._id}>
            <button
              type="button"
              onClick={() => onChange(m._id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer ${
                value === m._id ? "bg-brand-50" : ""
              }`}
            >
              <Avatar name={m.name} src={m.avatarUrl} size={24} />
              <span className="font-medium text-slate-800">{m.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
