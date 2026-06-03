"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { RequiredLabel } from "@/components/RequiredLabel";
import type { MemberField } from "@/lib/types";

export type ProjectFormState = {
  title: string;
  description: string;
  fieldId: string;
  budget: string;
  timeline: string;
  assignTo: string;
  completionRate: number;
};

type MemberOption = { _id: string; name: string };

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500";

export function ProjectFormFields({
  form,
  onChange,
  fields,
  members,
  showAssign,
  showProgress,
  error,
}: {
  form: ProjectFormState;
  onChange: (patch: Partial<ProjectFormState>) => void;
  fields: MemberField[];
  members: MemberOption[];
  showAssign: boolean;
  showProgress: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <RequiredLabel>Title</RequiredLabel>
        <input
          required
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className={INPUT_CLASS}
          placeholder="Optional"
        />
      </div>
      <div>
        <RequiredLabel>Field</RequiredLabel>
        <select
          required
          value={form.fieldId}
          onChange={(e) => onChange({ fieldId: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="">Select a field</option>
          {fields.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
          <input
            value={form.budget}
            onChange={(e) => onChange({ budget: e.target.value })}
            className={INPUT_CLASS}
            placeholder="e.g. $5,000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
          <input
            value={form.timeline}
            onChange={(e) => onChange({ timeline: e.target.value })}
            className={INPUT_CLASS}
            placeholder="e.g. Q2 2026"
          />
        </div>
      </div>
      {showAssign && (
        <div>
          <RequiredLabel>Assign to</RequiredLabel>
          <select
            required
            value={form.assignTo}
            onChange={(e) => onChange({ assignTo: e.target.value })}
            className={INPUT_CLASS}
          >
            <option value="">Select a member</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {showProgress && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Progress</span>
            <span className="font-semibold">{form.completionRate}%</span>
          </div>
          <ProgressBar value={form.completionRate} />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.completionRate}
            onChange={(e) => onChange({ completionRate: Number(e.target.value) })}
            className="w-full mt-2 accent-brand-600 cursor-pointer"
          />
          <p className="text-xs text-slate-400 mt-1">At 100%, status becomes Completed.</p>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
