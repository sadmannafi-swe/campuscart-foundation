import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Loader2 } from "lucide-react";
import { SellerShell, SellerPlaceholder } from "@/components/seller/SellerShell";
import { useAuth } from "@/lib/auth";
import { useMarkNotificationsRead, useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/notifications")({
  component: SellerNotifications,
});

function SellerNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notes = [], isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationsRead();
  const unreadIds = notes.filter((n) => !n.read_at).map((n) => n.id);

  return (
    <SellerShell title="Notifications">
      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : notes.length === 0 ? (
        <SellerPlaceholder title="You're all caught up" description="Store approval updates, order alerts and admin messages will show up here." />
      ) : (
        <>
          {unreadIds.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => markRead.mutate(unreadIds)} className="text-xs font-semibold text-primary">
                Mark all as read
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read_at) markRead.mutate([n.id]);
                    if (n.order_id) void navigate({ to: "/sell/dashboard/orders", search: { order: n.order_id } });
                  }}
                  className={cn("card-surface flex w-full items-start gap-3 p-3 text-left", !n.read_at && "border-primary/40 bg-primary-soft/40")}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Bell className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {n.title}
                      {!n.read_at && <span className="size-2 rounded-full bg-destructive" aria-label="Unread" />}
                    </span>
                    <span className="block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </SellerShell>
  );
}
