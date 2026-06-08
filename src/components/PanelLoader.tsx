import { PanelSkeleton, type PanelSkeletonVariant } from "@/components/skeleton/PanelSkeleton";

/** @deprecated Use PanelSkeleton directly */
export function PanelLoader({
  label: _label = "Loading...",
  variant = "table",
}: {
  label?: string;
  variant?: PanelSkeletonVariant;
}) {
  return <PanelSkeleton variant={variant} />;
}
