import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChatConversation {
  id: string;
  product_id: string;
  store_id: string;
  seller_user_id: string;
  buyer_id: string;
  university_slug: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  buyer_name: string;
  first_message_at: string | null;
  last_message_at: string | null;
  last_message_preview: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "buyer" | "seller";
  body: string;
  read_at: string | null;
  created_at: string;
}

/** Open (or create) the buyer's conversation for a product. Returns the conversation id. */
export async function openProductChat(productId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_product_chat", { _product_id: productId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function sendChatMessage(conversationId: string, body: string): Promise<void> {
  const { error } = await supabase.rpc("send_chat_message", {
    _conversation_id: conversationId,
    _body: body,
  });
  if (error) throw new Error(error.message);
}

export async function markChatRead(conversationId: string): Promise<void> {
  await supabase.rpc("mark_chat_read", { _conversation_id: conversationId });
}

/** Buyer inbox: all own conversations, newest activity first. */
export function useBuyerConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversations", "buyer", userId],
    enabled: !!userId,
    refetchInterval: 10_000,
    queryFn: async (): Promise<ChatConversation[]> => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("buyer_id", userId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChatConversation[];
    },
  });
}

/** Seller inbox: only conversations where the buyer has sent the first message. */
export function useSellerConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversations", "seller", userId],
    enabled: !!userId,
    refetchInterval: 10_000,
    queryFn: async (): Promise<ChatConversation[]> => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("seller_user_id", userId!)
        .not("first_message_at", "is", null)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChatConversation[];
    },
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversation", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatConversation | null> => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ChatConversation | null) ?? null;
    },
  });
}

export function useChatMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    enabled: !!conversationId,
    refetchInterval: 6_000,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });
}

/** Unread message counts per conversation for the current user. */
export function useUnreadChatCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-unread", userId],
    enabled: !!userId,
    refetchInterval: 10_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("conversation_id")
        .is("read_at", null)
        .neq("sender_id", userId!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.conversation_id] = (counts[row.conversation_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}
