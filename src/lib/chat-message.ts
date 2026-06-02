import type { MessageWithSender } from "./repo";
import type { ChatMessage } from "./types";

export function toChatMessage(m: MessageWithSender, recipient?: string): ChatMessage {
  return {
    _id: m._id,
    sender: m.sender,
    recipient,
    content: m.content,
    createdAt: m.createdAt,
  };
}
