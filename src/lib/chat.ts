import { useQuery } from "@tanstack/react-query";
import type {
  ChatConversation as ChatConversationT,
  ChatMessage as ChatMessageT,
} from "@shared/types";
import { api, ApiError, apiPost } from "@/lib/api";

export type ChatConversation = ChatConversationT;
export type ChatMessage = ChatMessageT;

/** Open (or create) the buyer's conversation for a product. Returns the conversation id. */
export async function openProductChat(productId: string, university: string): Promise<string> {
  const { id } = await apiPost<{ id: string }>("/chat/open", { product_id: productId, university });
  return id;
}

export async function sendChatMessage(conversationId: string, body: string): Promise<void> {
  await apiPost(`/chat/conversations/${conversationId}/messages`, { body });
}

export async function markChatRead(conversationId: string): Promise<void> {
  await apiPost(`/chat/conversations/${conversationId}/read`);
}

/** Buyer inbox: all own conversations, newest activity first. */
export function useBuyerConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversations", "buyer", userId],
    enabled: !!userId,
    refetchInterval: 10_000,
    queryFn: () => api<ChatConversation[]>("/chat/conversations?role=buyer"),
  });
}

/** Seller inbox: only conversations where the buyer has sent the first message. */
export function useSellerConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversations", "seller", userId],
    enabled: !!userId,
    refetchInterval: 10_000,
    queryFn: () => api<ChatConversation[]>("/chat/conversations?role=seller"),
  });
}

/**
 * One conversation. Resolves to `null` only when the API says it doesn't exist or
 * isn't the viewer's (404/403); any other failure (offline, server error) stays an
 * error so the page can offer a retry instead of claiming the chat is gone.
 */
export function useConversation(conversationId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: ["chat-conversation", conversationId, userId],
    enabled: !!conversationId,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    queryFn: async () => {
      try {
        return await api<ChatConversation>(`/chat/conversations/${conversationId}`);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;
        throw err;
      }
    },
  });
}

const MODULE_KINDS = new Set(["preowned", "blood_request", "donor", "basha"]);

/**
 * Where a participant reads a conversation (the API enforces who is a participant):
 * - "inbox": the personal inbox (/chat) — the person who started it, and the owner
 *   of a Pre-Owned / blood / donor / BashaLagbe post someone messaged about;
 * - "seller": the store dashboard — the store owner of a Marketplace product chat;
 * - "none": not a participant.
 */
export function conversationPlace(
  conversation: Pick<ChatConversation, "buyer_id" | "seller_user_id" | "kind">,
  userId: string,
): "inbox" | "seller" | "none" {
  if (conversation.buyer_id === userId) return "inbox";
  if (conversation.seller_user_id === userId)
    return conversation.kind && MODULE_KINDS.has(conversation.kind) ? "inbox" : "seller";
  return "none";
}

export function useChatMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    enabled: !!conversationId,
    refetchInterval: 6_000,
    queryFn: () => api<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`),
  });
}

/** Unread message counts per conversation for the current user. */
export function useUnreadChatCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-unread", userId],
    enabled: !!userId,
    refetchInterval: 10_000,
    queryFn: () => api<Record<string, number>>("/chat/unread"),
  });
}
