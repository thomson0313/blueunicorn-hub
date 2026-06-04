import { z } from "zod";
import { buildBudgetPatch } from "@/lib/project-budget";

export const budgetFieldsSchema = z.object({
  budgetType: z.enum(["hourly", "fixed"]).optional(),
  budgetCurrency: z.string().max(8).optional(),
  budgetAmount: z.string().max(24).optional(),
});

export function applyBudgetToPatch(
  patch: {
    budget?: string;
    budgetType?: "hourly" | "fixed";
    budgetCurrency?: string;
    budgetAmount?: string;
  },
  data: z.infer<typeof budgetFieldsSchema>
): void {
  if (
    data.budgetType === undefined &&
    data.budgetCurrency === undefined &&
    data.budgetAmount === undefined
  ) {
    return;
  }
  const built = buildBudgetPatch({
    budgetType: data.budgetType,
    budgetCurrency: data.budgetCurrency,
    budgetAmount: data.budgetAmount,
  });
  patch.budget = built.budget;
  patch.budgetType = built.budgetType;
  patch.budgetCurrency = built.budgetCurrency;
  patch.budgetAmount = built.budgetAmount;
}
