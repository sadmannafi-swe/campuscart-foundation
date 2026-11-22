import { useQuery } from "@tanstack/react-query";
import type {
  ChatConversation as ChatConversationT,
  ChatMessage as ChatMessageT,
} from "@shared/types";
import { api, apiPost } from "@/lib/api";

export type ChatConversation = ChatConversationT;
export type ChatMessage = ChatMessageT;

/** Open (or create) the buyer's conversation for a product. Returns the conversation id. */
export async function openProductChat(productId: string): Promise<string> {
  const { id } = await apiPost<{ id: string }>("/chat/open", { product_id: productId });
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

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversation", conversationId],
    enabled: !!conversationId,
    queryFn: () => api<ChatConversation>(`/chat/conversations/${conversationId}`).catch(() => null),
  });
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
