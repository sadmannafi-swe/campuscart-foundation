import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { ConversationList } from "@/components/chat/ConversationList";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useBuyerConversations, useUnreadChatCounts } from "@/lib/chat";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messages — CampusCart" },
      { name: "description", content: "Your buyer–seller conversations on CampusCart." },
      { property: "og:title", content: "Messages — CampusCart" },
      { property: "og:description", content: "Your buyer–seller conversations on CampusCart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerInboxPage,
});

function BuyerInboxPage() {
  const { user, loading } = useAuth();
  const { data: conversations = [], isLoading } = useBuyerConversations(user?.id);
  const { data: unread = {} } = useUnreadChatCounts(user?.id);

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <BackButton className="mb-3" />
        <h1 className="text-xl font-bold sm:text-2xl">Messages</h1>
        <div className="card-surface mt-4 overflow-hidden">
          {loading || isLoading ? (
            <p className="px-6 py-14 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !user ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                Log in to chat with sellers about their products.
              </p>
              <Button asChild>
                <Link to="/auth" search={{ mode: "login" }}>Log in / Create account</Link>
              </Button>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              unread={unread}
              accent="buyer"
              buildLink={(id) => ({ to: "/chat/$conversationId", params: { conversationId: id } })}
              emptyText="No conversations yet. Open a product and tap “Chat with Seller”."
            />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
