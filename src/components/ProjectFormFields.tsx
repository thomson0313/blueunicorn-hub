"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { RequiredLabel } from "@/components/RequiredLabel";
import { timelineToInputValue } from "@/lib/project-timeline";
import { MemberAssignSelect, type MemberOption } from "@/components/projects/MemberAssignSelect";
import type { MemberField } from "@/lib/types";

export type ProjectFormState = {
  title: string;
  description: string;
  fieldId: string;
  budget: string;
  timeline: string;
  previewLink: string;
  githubLink: string;
  assignTo: string;
  completionRate: number;
};

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
          <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
          <input
            type="date"
            value={timelineToInputValue(form.timeline)}
            onChange={(e) => onChange({ timeline: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Preview link</label>
        <input
          value={form.previewLink}
          onChange={(e) => onChange({ previewLink: e.target.value })}
          className={INPUT_CLASS}
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">GitHub repository</label>
        <input
          value={form.githubLink}
          onChange={(e) => onChange({ githubLink: e.target.value })}
          className={INPUT_CLASS}
          placeholder="https://github.com/..."
        />
      </div>
      {showAssign && (
        <div>
          <RequiredLabel>Assign to</RequiredLabel>
          <MemberAssignSelect value={form.assignTo} members={members} onChange={(id) => onChange({ assignTo: id })} />
        </div>
      )}
      {showProgress && (
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Progress</span>
            <span className="font-semibold text-brand-700">{form.completionRate}%</span>
          </div>
          <ProgressBar value={form.completionRate} />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.completionRate}
            onChange={(e) => onChange({ completionRate: Number(e.target.value) })}
            className="w-full mt-3 h-2 rounded-lg appearance-none cursor-pointer accent-brand-600"
            style={{ background: "transparent" }}
          />
          <p className="text-xs text-slate-400 mt-1">At 100%, status becomes Completed.</p>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
