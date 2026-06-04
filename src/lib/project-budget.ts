import type { Project } from "@/lib/types";

export type BudgetType = "hourly" | "fixed";

export const BUDGET_CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "JPY", symbol: "¥" },
  { code: "CHF", symbol: "CHF" },
  { code: "INR", symbol: "₹" },
] as const;

export type BudgetCurrencyCode = (typeof BUDGET_CURRENCIES)[number]["code"];

export function currencySymbol(code: string): string {
  return BUDGET_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function sanitizeBudgetAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function formatAmountNumber(amount: string): string {
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return amount;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatBudgetDisplay(
  type: BudgetType,
  currency: string,
  amount: string
): string {
  const amt = sanitizeBudgetAmount(amount);
  if (!amt) return "";
  const sym = currencySymbol(currency);
  const formatted = formatAmountNumber(amt);
  return type === "hourly" ? `${sym}${formatted}/hr` : `${sym}${formatted}`;
}

export function formatProjectBudgetDisplay(
  p: Pick<Project, "budget" | "budgetType" | "budgetCurrency" | "budgetAmount">
): string {
  const amt = p.budgetAmount?.trim();
  if (amt) {
    return (
      formatBudgetDisplay(p.budgetType ?? "fixed", p.budgetCurrency ?? "USD", amt) || "N/A"
    );
  }
  const legacy = p.budget?.trim();
  return legacy ? legacy : "N/A";
}

const SYMBOL_TO_CODE: Record<string, BudgetCurrencyCode> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
};

function detectCurrencyFromLegacy(text: string): BudgetCurrencyCode {
  for (const { code, symbol } of BUDGET_CURRENCIES) {
    if (text.includes(symbol)) return code;
  }
  const first = text.trim()[0];
  if (first && SYMBOL_TO_CODE[first]) return SYMBOL_TO_CODE[first];
  if (text.toUpperCase().includes("EUR")) return "EUR";
  if (text.toUpperCase().includes("GBP")) return "GBP";
  return "USD";
}

export function parseLegacyBudgetString(raw: string): {
  budgetType: BudgetType;
  budgetCurrency: BudgetCurrencyCode;
  budgetAmount: string;
} {
  const text = raw.trim();
  if (!text) {
    return { budgetType: "fixed", budgetCurrency: "USD", budgetAmount: "" };
  }
  const hourly = /\/\s*hr\b/i.test(text);
  const amount = sanitizeBudgetAmount(text.replace(/\/\s*hr\b/gi, ""));
  return {
    budgetType: hourly ? "hourly" : "fixed",
    budgetCurrency: detectCurrencyFromLegacy(text),
    budgetAmount: amount,
  };
}

export function budgetFieldsFromProject(
  p: Pick<Project, "budget" | "budgetType" | "budgetCurrency" | "budgetAmount">
): {
  budgetType: BudgetType;
  budgetCurrency: BudgetCurrencyCode;
  budgetAmount: string;
} {
  if (p.budgetAmount?.trim()) {
    const code = BUDGET_CURRENCIES.some((c) => c.code === p.budgetCurrency)
      ? (p.budgetCurrency as BudgetCurrencyCode)
      : "USD";
    return {
      budgetType: p.budgetType === "hourly" ? "hourly" : "fixed",
      budgetCurrency: code,
      budgetAmount: sanitizeBudgetAmount(p.budgetAmount),
    };
  }
  return parseLegacyBudgetString(p.budget ?? "");
}

export function buildBudgetPatch(data: {
  budgetType?: BudgetType;
  budgetCurrency?: string;
  budgetAmount?: string;
}): {
  budget: string;
  budgetType: BudgetType;
  budgetCurrency: string;
  budgetAmount: string;
} {
  const budgetType: BudgetType = data.budgetType === "hourly" ? "hourly" : "fixed";
  const budgetCurrency =
    BUDGET_CURRENCIES.find((c) => c.code === data.budgetCurrency)?.code ?? "USD";
  const budgetAmount = sanitizeBudgetAmount(data.budgetAmount ?? "");
  const budget = formatBudgetDisplay(budgetType, budgetCurrency, budgetAmount);
  return { budget, budgetType, budgetCurrency, budgetAmount };
}
