import type { Project } from "@/lib/types";
import { formatProjectBudgetDisplay } from "@/lib/project-budget";

function ensureHref(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export function ProjectLinkIcons({
  previewLink,
  githubLink,
  size = 18,
}: {
  previewLink?: string;
  githubLink?: string;
  size?: number;
}) {
  const preview = previewLink?.trim();
  const github = githubLink?.trim();
  if (!preview && !github) return null;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {preview && (
        <a
          href={ensureHref(preview)}
          target="_blank"
          rel="noopener noreferrer"
          title="Preview link"
          className="p-1 rounded-full text-slate-500 hover:bg-slate-100 hover:text-brand-600 cursor-pointer"
          aria-label="Open preview link"
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </a>
      )}
      {github && (
        <a
          href={ensureHref(github)}
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub repository"
          className="p-1 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          aria-label="Open GitHub repository"
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 1.005-.315 3.3 1.23 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c0 0 2.295-1.56 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      )}
    </div>
  );
}

/** @deprecated Use displayProjectBudget(project) */
export function displayBudgetTimeline(value: string): string {
  const v = value?.trim();
  return v ? v : "N/A";
}

export function displayProjectBudget(project: Pick<Project, "budget" | "budgetType" | "budgetCurrency" | "budgetAmount">): string {
  return formatProjectBudgetDisplay(project);
}
