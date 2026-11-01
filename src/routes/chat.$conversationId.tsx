import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatThread } from "@/components/chat/ChatThread";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useBuyerConversations, useConversation, useUnreadChatCounts } from "@/lib/chat";

export const Route = createFileRoute("/chat/$conversationId")({
  head: () => ({
    meta: [
      { title: "Chat — CampusCart" },
      { name: "description", content: "Buyer–seller product conversation on CampusCart." },
      { property: "og:title", content: "Chat — CampusCart" },
      { property: "og:description", content: "Buyer–seller product conversation on CampusCart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerChatPage,
});

function BuyerChatPage() {
  const { conversationId } = Route.useParams();
  const { user, loading } = useAuth();
  const { data: conversation, isLoading } = useConversation(conversationId);
  const { data: conversations = [] } = useBuyerConversations(user?.id);
  const { data: unread = {} } = useUnreadChatCounts(user?.id);

  const owned = !!user && !!conversation && conversation.buyer_id === user.id;

  return (
    <SiteLayout>
      <div className="container-page py-6">
        {loading || isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !user ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Log in to view this conversation.</p>
            <Button asChild>
              <Link to="/auth">Log in / Create account</Link>
            </Button>
          </div>
        ) : !conversation || !owned ? (
          <div className="py-16 text-center">
            <h1 className="text-xl font-bold">Conversation unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This conversation does not exist or belongs to another account.
            </p>
            <Button asChild className="mt-4">
              <Link to="/chat">Back to messages</Link>
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
                accent="buyer"
                buildLink={(id) => ({ to: "/chat/$conversationId", params: { conversationId: id } })}
                emptyText="No conversations yet."
              />
            </aside>
            <div className="card-surface h-[calc(100dvh-10rem)] overflow-hidden lg:h-[calc(100dvh-8rem)]">
              <ChatThread
                conversation={conversation}
                viewerId={user.id}
                accent="buyer"
                backTo="/chat"
              />
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
