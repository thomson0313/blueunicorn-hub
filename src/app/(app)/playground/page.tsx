import { PlaygroundPanel } from "@/components/playground/PlaygroundPanel";
import { requirePageSession } from "@/lib/require-page-session";

export default async function PlaygroundPage() {
  await requirePageSession();
  return <PlaygroundPanel />;
}
