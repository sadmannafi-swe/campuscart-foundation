import { createFileRoute } from "@tanstack/react-router";
import { SellerShell } from "@/components/seller/SellerShell";
import { ConversationList } from "@/components/chat/ConversationList";
import { useAuth } from "@/lib/auth";
import { useSellerConversations, useUnreadChatCounts } from "@/lib/chat";

export const Route = createFileRoute("/sell/dashboard/messages")({
  head: () => ({
    meta: [
      { title: "Buyer Messages — CampusCart Seller" },
      { name: "description", content: "Reply to buyer conversations about your store's products." },
      { property: "og:title", content: "Buyer Messages — CampusCart Seller" },
      { property: "og:description", content: "Reply to buyer conversations about your store's products." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SellerMessagesPage,
});

function SellerMessagesPage() {
  const { user } = useAuth();
  const { data: conversations = [], isLoading } = useSellerConversations(user?.id);
  const { data: unread = {} } = useUnreadChatCounts(user?.id);

  return (
    <SellerShell title="Messages">
      <div className="card-surface overflow-hidden">
        {isLoading ? (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ConversationList
            conversations={conversations}
            unread={unread}
            accent="seller"
            buildLink={(id) => ({
              to: "/sell/dashboard/messages/$conversationId",
              params: { conversationId: id },
            })}
            emptyText="No buyer messages yet. Conversations appear here once a buyer messages you about a product."
          />
        )}
      </div>
    </SellerShell>
  );
}
