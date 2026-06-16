"use client";

import { formatChannelCreatedAt } from "@/lib/chat-format";

export type ChannelMeta = {
  visibility: "public" | "private";
  createdByName: string;
  createdAt: string | null;
  isGeneral?: boolean;
};

export function ChannelCreatedBanner({ meta }: { meta: ChannelMeta }) {
  const visLabel = meta.visibility === "private" ? "private" : "public";
  const when = meta.createdAt ? ` at ${formatChannelCreatedAt(meta.createdAt)}` : "";
  const creator = meta.isGeneral ? meta.createdByName || "Admin" : meta.createdByName;

  return (
    <div className="flex justify-center py-4 px-2">
      <p className="text-xs text-slate-400 text-center max-w-md leading-relaxed">
        This {visLabel} channel has been created by{" "}
        <span className="font-medium text-slate-500">{creator}</span>
        {when}.
      </p>
    </div>
  );
}
