import { currencySymbol } from "@/lib/project-budget";
import type { Project } from "@/lib/types";

export function parseMoneyAmount(amount: string | undefined): number {
  const n = parseFloat((amount ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Fixed: budget × progress%. Hourly: rate × estimated hours. */
export function projectEstimatedValue(p: Project): number {
  const rate = parseMoneyAmount(p.budgetAmount);
  if (p.budgetType === "hourly") {
    return rate * (p.estimatedHours ?? 0);
  }
  return rate * (p.completionRate / 100);
}

/** Fixed: same as estimated. Hourly: rate × logged hours. */
export function projectEarnedValue(p: Project): number {
  const rate = parseMoneyAmount(p.budgetAmount);
  if (p.budgetType === "hourly") {
    return rate * (p.totalLoggedHours ?? 0);
  }
  return rate * (p.completionRate / 100);
}

export type BudgetFinancialSummary = {
  estimated: number;
  earned: number;
  primaryCurrency: string;
};

export function summarizeBudgetFinancials(projects: Project[]): BudgetFinancialSummary {
  const active = projects.filter((p) => p.status !== "archived");
  let estimated = 0;
  let earned = 0;
  for (const p of active) {
    estimated += projectEstimatedValue(p);
    earned += projectEarnedValue(p);
  }
  const primaryCurrency = active.find((p) => p.budgetCurrency)?.budgetCurrency ?? "USD";
  return { estimated, earned, primaryCurrency };
}

export function formatBudgetFinancialSummary(summary: BudgetFinancialSummary): string {
  const sym = currencySymbol(summary.primaryCurrency);
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${sym}${fmt(summary.estimated)} / ${sym}${fmt(summary.earned)}`;
}

export function formatHourlyEstimation(p: Project): string {
  const hours = p.estimatedHours ?? 0;
  if (hours <= 0) return "";
  const sym = currencySymbol(p.budgetCurrency ?? "USD");
  const total = parseMoneyAmount(p.budgetAmount) * hours;
  return `Est. ${hours}h (${sym}${total.toLocaleString("en-US", { maximumFractionDigits: 0 })})`;
}
