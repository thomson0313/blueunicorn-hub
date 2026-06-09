"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { RequiredLabel } from "@/components/RequiredLabel";
import { timelineToInputValue } from "@/lib/project-timeline";
import { MemberAssignSelect, type MemberOption } from "@/components/projects/MemberAssignSelect";
import { BudgetAmountInput } from "@/components/projects/BudgetAmountInput";
import { ProjectTimeTracker } from "@/components/projects/ProjectTimeTracker";
import type { BudgetType, BudgetCurrencyCode } from "@/lib/project-budget";
import type { MemberField } from "@/lib/types";

export type ProjectFormState = {
  title: string;
  description: string;
  fieldId: string;
  budgetType: BudgetType;
  budgetCurrency: BudgetCurrencyCode;
  budgetAmount: string;
  estimatedHours: string;
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
  projectId,
  projectCreatedAt,
  savedBudgetType,
  canTrackTime,
  onTimeLogged,
  error,
}: {
  form: ProjectFormState;
  onChange: (patch: Partial<ProjectFormState>) => void;
  fields: MemberField[];
  members: MemberOption[];
  showAssign: boolean;
  showProgress: boolean;
  projectId?: string;
  projectCreatedAt?: string;
  savedBudgetType?: BudgetType;
  canTrackTime?: boolean;
  onTimeLogged?: () => void;
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
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">Budget type</span>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="budgetType"
              checked={form.budgetType === "fixed"}
              onChange={() => onChange({ budgetType: "fixed" })}
              className="accent-brand-600 cursor-pointer"
            />
            Fixed
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="budgetType"
              checked={form.budgetType === "hourly"}
              onChange={() => onChange({ budgetType: "hourly" })}
              className="accent-brand-600 cursor-pointer"
            />
            Hourly
          </label>
        </div>
      </div>
      <div className={`grid gap-3 ${form.budgetType === "hourly" ? "grid-cols-3" : "grid-cols-2"}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
          <BudgetAmountInput
            currency={form.budgetCurrency}
            amount={form.budgetAmount}
            onCurrencyChange={(budgetCurrency) => onChange({ budgetCurrency })}
            onAmountChange={(budgetAmount) => onChange({ budgetAmount })}
          />
        </div>
        {form.budgetType === "hourly" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated hours</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.estimatedHours}
              onChange={(e) => onChange({ estimatedHours: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g. 40"
            />
          </div>
        )}
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
      {projectId && savedBudgetType === "hourly" && canTrackTime && projectCreatedAt ? (
        <ProjectTimeTracker
          projectId={projectId}
          projectCreatedAt={projectCreatedAt}
          onUpdated={onTimeLogged}
        />
      ) : projectId && form.budgetType === "hourly" && savedBudgetType === "fixed" ? (
        <p className="text-sm text-slate-500">Save changes to switch this project to hourly time tracking.</p>
      ) : (
        showProgress && (
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
        )
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
