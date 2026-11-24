import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BackButton } from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMarkNotificationsRead, useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DIU CampusCart" },
      { name: "description", content: "Updates about your CampusCart orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerNotificationsPage,
});

function BuyerNotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: notes = [], isLoading } = useNotifications(user?.id, "buyer");
  const markRead = useMarkNotificationsRead();
  const unreadIds = notes.filter((n) => !n.read_at).map((n) => n.id);

  return (
    <SiteLayout>
      <div className="container-page py-6">
        <BackButton className="mb-3" />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unreadIds.length > 0 && (
            <button
              type="button"
              onClick={() => markRead.mutate(unreadIds)}
              className="text-xs font-semibold text-primary"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading || (user && isLoading) ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="card-surface mt-6 p-8 text-center">
            <p className="font-semibold">Log in to see your notifications</p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/auth" search={{ mode: "login" }}>
                Log in
              </Link>
            </Button>
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Bell className="size-8 text-primary" aria-hidden="true" />}
            title="You're all caught up"
            description="Updates about your orders — confirmed, shipped, delivered or cancelled — will show up here."
          />
        ) : (
          <ul className="mt-5 space-y-2">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read_at) markRead.mutate([n.id]);
                    if (n.order_id) void navigate({ to: "/orders", search: { order: n.order_id } });
                  }}
                  className={cn(
                    "card-surface flex w-full items-start gap-3 p-3 text-left",
                    !n.read_at && "border-primary/40 bg-primary-soft/40",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <Bell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {n.title}
                      {!n.read_at && (
                        <span className="size-2 rounded-full bg-destructive" aria-label="Unread" />
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
