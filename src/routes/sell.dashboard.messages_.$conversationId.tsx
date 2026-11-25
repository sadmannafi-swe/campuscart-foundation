import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatThread } from "@/components/chat/ChatThread";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  conversationPlace,
  useConversation,
  useSellerConversations,
  useUnreadChatCounts,
} from "@/lib/chat";

export const Route = createFileRoute("/sell/dashboard/messages_/$conversationId")({
  head: () => ({
    meta: [
      { title: "Buyer Chat — CampusCart Seller" },
      { name: "description", content: "Reply to a buyer about your product." },
      { property: "og:title", content: "Buyer Chat — CampusCart Seller" },
      { property: "og:description", content: "Reply to a buyer about your product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SellerChatPage,
});

function SellerChatPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const {
    data: conversation,
    isLoading,
    isError,
    refetch,
  } = useConversation(conversationId, user?.id);
  const { data: conversations = [] } = useSellerConversations(user?.id);
  const { data: unread = {} } = useUnreadChatCounts(user?.id);

  const place = user && conversation ? conversationPlace(conversation, user.id) : "none";

  return (
    <SellerShell title="Buyer Chat">
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <div className="py-16 text-center">
          <h2 className="text-xl font-semibold">Couldn't load this conversation</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : place === "inbox" ? (
        <Navigate to="/chat/$conversationId" params={{ conversationId }} replace />
      ) : !conversation || place !== "seller" ? (
        <div className="py-16 text-center">
          <h2 className="text-xl font-semibold">Conversation unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This conversation does not exist or belongs to another store.
          </p>
          <Button asChild className="mt-4">
            <Link to="/sell/dashboard/messages">Back to messages</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <aside className="card-surface hidden self-start overflow-hidden lg:block">
            <p className="border-b border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground">
              Messages
            </p>
            <ConversationList
              conversations={conversations}
              unread={unread}
              activeId={conversationId}
              accent="seller"
              buildLink={(id) => ({
                to: "/sell/dashboard/messages/$conversationId",
                params: { conversationId: id },
              })}
              emptyText="No buyer messages yet."
            />
          </aside>
          <div className="card-surface h-[calc(100dvh-12rem)] overflow-hidden lg:h-[calc(100dvh-13rem)]">
            <ChatThread
              conversation={conversation}
              viewerId={user!.id}
              accent="seller"
              backTo="/sell/dashboard/messages"
            />
          </div>
        </div>
      )}
    </SellerShell>
  );
}
