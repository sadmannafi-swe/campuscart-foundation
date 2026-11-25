import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatThread } from "@/components/chat/ChatThread";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  conversationPlace,
  useBuyerConversations,
  useConversation,
  useUnreadChatCounts,
} from "@/lib/chat";

export const Route = createFileRoute("/chat_/$conversationId")({
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
  const {
    data: conversation,
    isLoading,
    isError,
    refetch,
  } = useConversation(conversationId, user?.id);
  const { data: conversations = [] } = useBuyerConversations(user?.id);
  const { data: unread = {} } = useUnreadChatCounts(user?.id);

  // The personal inbox lists chats the user started AND chats others started about the
  // user's Pre-Owned / blood / BashaLagbe posts, so both participants read them here.
  const place = user && conversation ? conversationPlace(conversation, user.id) : "none";

  return (
    <SiteLayout>
      <div className="container-page py-6">
        {loading || isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !user ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Log in to view this conversation.</p>
            <Button asChild>
              <Link to="/auth" search={{ mode: "login" }}>
                Log in / Create account
              </Link>
            </Button>
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <h1 className="text-xl font-semibold">Couldn't load this conversation</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button className="mt-4" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : place === "seller" ? (
          <Navigate
            to="/sell/dashboard/messages/$conversationId"
            params={{ conversationId }}
            replace
          />
        ) : !conversation || place !== "inbox" ? (
          <div className="py-16 text-center">
            <h1 className="text-xl font-semibold">Conversation unavailable</h1>
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
              <p className="border-b border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                Messages
              </p>
              <ConversationList
                conversations={conversations}
                unread={unread}
                activeId={conversationId}
                accent="buyer"
                buildLink={(id) => ({
                  to: "/chat/$conversationId",
                  params: { conversationId: id },
                })}
                emptyText="No conversations yet."
              />
            </aside>
            {/* phones: fill the space between the header and the bottom bar so the composer is never under it */}
            <div className="card-surface h-[calc(100dvh-12.75rem-env(safe-area-inset-bottom))] min-h-[20rem] overflow-hidden lg:h-[calc(100dvh-13rem)]">
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
