import { createFileRoute, Link } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatThread } from "@/components/chat/ChatThread";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useConversation, useSellerConversations, useUnreadChatCounts } from "@/lib/chat";

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
  const { data: conversation, isLoading } = useConversation(conversationId);
  const { data: conversations = [] } = useSellerConversations(user?.id);
  const { data: unread = {} } = useUnreadChatCounts(user?.id);

  const owned = !!user && !!conversation && conversation.seller_user_id === user.id;

  return (
    <SellerShell title="Buyer Chat">
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : !conversation || !owned ? (
        <div className="py-16 text-center">
          <h2 className="text-xl font-bold">Conversation unavailable</h2>
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
            <p className="border-b border-border px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
          <div className="card-surface h-[calc(100dvh-12rem)] overflow-hidden lg:h-[calc(100dvh-8rem)]">
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
