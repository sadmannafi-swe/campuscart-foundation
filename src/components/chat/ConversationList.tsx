import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { ChatConversation } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function ConversationList({
  conversations,
  unread,
  activeId,
  accent,
  buildLink,
  emptyText,
}: {
  conversations: ChatConversation[];
  unread: Record<string, number>;
  activeId?: string | undefined;
  accent: "buyer" | "seller";
  buildLink: (id: string) => { to: string; params?: Record<string, string> };
  emptyText: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <span
          className={cn(
            "grid size-12 place-items-center rounded-full",
            accent === "buyer" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent",
          )}
        >
          <MessageCircle className="size-6" aria-hidden="true" />
        </span>
        <p className="max-w-xs text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((c) => {
        const count = unread[c.id] ?? 0;
        const when = c.last_message_at ?? c.created_at;
        return (
          <li key={c.id}>
            <Link
              {...buildLink(c.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/60",
                activeId === c.id && (accent === "buyer" ? "bg-primary-soft/60" : "bg-accent-soft/60"),
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold",
                  accent === "buyer" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent",
                )}
              >
                {(accent === "buyer" ? c.product_name : c.buyer_name).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {accent === "buyer" ? c.product_name : c.buyer_name}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(when).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {c.last_message_preview || `${c.product_name} · ${formatPrice(Number(c.product_price))}`}
                  </span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold",
                        accent === "buyer"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground",
                      )}
                    >
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
