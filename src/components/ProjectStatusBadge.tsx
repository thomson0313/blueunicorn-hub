import type { ProjectStatus } from "@/lib/types";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_STYLES } from "@/lib/project-rules";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_STYLES[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
