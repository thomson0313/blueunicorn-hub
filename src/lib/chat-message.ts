import type { ExtendedMessageRec } from "./chat-repo";
import type { MessageWithSender } from "./repo";
import type { ChatMessage } from "./types";

export function toChatMessage(m: ExtendedMessageRec, recipient?: string): ChatMessage {
  return {
    _id: m._id,
    sender: m.sender,
    recipient,
    channelId: m.channelId,
    parentId: m.parentId,
    content: m.deletedAt ? "" : m.content,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    attachments: m.attachments.map((a) => ({
      _id: a._id,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
    })),
    reactions: m.reactions.map((r) => ({
      emoji: r.emoji,
      userId: r.userId,
      userName: r.userName,
    })),
    replyTo: m.replyTo,
  };
}

/** Legacy mapper for inbox polling (simple messages without attachments). */
export function toChatMessageLegacy(m: MessageWithSender, recipient?: string): ChatMessage {
  return {
    _id: m._id,
    sender: m.sender,
    recipient,
    content: m.content,
    createdAt: m.createdAt,
  };
}
