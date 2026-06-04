"use client";

import { BUDGET_CURRENCIES, sanitizeBudgetAmount, type BudgetCurrencyCode } from "@/lib/project-budget";

export function BudgetAmountInput({
  currency,
  amount,
  onCurrencyChange,
  onAmountChange,
}: {
  currency: BudgetCurrencyCode;
  amount: string;
  onCurrencyChange: (code: BudgetCurrencyCode) => void;
  onAmountChange: (amount: string) => void;
}) {
  return (
    <div className="flex w-full rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
      <select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value as BudgetCurrencyCode)}
        className="shrink-0 border-0 border-r border-slate-200 bg-slate-50 pl-2 pr-1 py-2 text-sm font-medium text-slate-800 focus:outline-none cursor-pointer max-w-[4.5rem]"
        aria-label="Currency"
      >
        {BUDGET_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol}
          </option>
        ))}
      </select>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => onAmountChange(sanitizeBudgetAmount(e.target.value))}
        placeholder="0"
        className="flex-1 min-w-0 border-0 px-3 py-2 text-sm focus:outline-none"
      />
    </div>
  );
}
