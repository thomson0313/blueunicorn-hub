import { NotFoundView } from "@/components/NotFoundView";

export default function AppNotFound() {
  return <NotFoundView embedded homeHref="/dashboard" homeLabel="Go to dashboard" />;
}
