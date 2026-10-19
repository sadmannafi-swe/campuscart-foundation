import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { liveProductSlug } from "@/lib/liveCatalog";
import { markChatRead, sendChatMessage, useChatMessages, type ChatConversation } from "@/lib/chat";
import { useSignedUrl } from "@/lib/seller";
import { cn } from "@/lib/utils";

export type ChatAccent = "buyer" | "seller";

const accentStyles: Record<
  ChatAccent,
  { bubble: string; button: string; ring: string }
> = {
  buyer: {
    bubble: "bg-primary text-primary-foreground",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
    ring: "focus-visible:ring-primary",
  },
  seller: {
    bubble: "bg-accent text-accent-foreground",
    button: "bg-accent text-accent-foreground hover:bg-accent/90",
    ring: "focus-visible:ring-accent",
  },
};

function ProductContextCard({
  conversation,
  accent,
}: {
  conversation: ChatConversation;
  accent: ChatAccent;
}) {
  const { data: imageUrl } = useSignedUrl(conversation.product_image);
  const slug = liveProductSlug(conversation.product_name, conversation.product_id);
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-xs font-bold text-muted-foreground">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          conversation.product_name.slice(0, 2).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{conversation.product_name}</p>
        <p className={cn("text-xs font-bold", accent === "buyer" ? "text-primary" : "text-accent")}>
          {formatPrice(Number(conversation.product_price))}
        </p>
      </div>
      <Link
        to="/products/$productSlug"
        params={{ productSlug: slug }}
        className={cn(
          "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
          accent === "buyer" ? "hover:border-primary hover:text-primary" : "hover:border-accent hover:text-accent",
        )}
      >
        View Product
      </Link>
    </div>
  );
}

export function ChatThread({
  conversation,
  viewerId,
  accent,
  backTo,
  onBack,
}: {
  conversation: ChatConversation;
  viewerId: string;
  accent: ChatAccent;
  /** Mobile back link target (list route). */
  backTo: string;
  onBack?: () => void;
}) {
  const styles = accentStyles[accent];
  const { data: messages = [] } = useChatMessages(conversation.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void markChatRead(conversation.id);
  }, [conversation.id, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendChatMessage(conversation.id, body);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  const otherName = accent === "buyer" ? "Seller" : conversation.buyer_name;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2">
        <Link
          to={backTo}
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{otherName}</p>
          <p className="text-[11px] text-muted-foreground">
            {accent === "buyer" ? "Seller chat" : "Buyer chat"}
          </p>
        </div>
      </div>

      <ProductContextCard conversation={conversation} accent={accent} />

      <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 px-3 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {accent === "buyer"
              ? "Say hello — the seller will see your conversation once you send the first message."
              : "No messages yet."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  mine ? cn("rounded-br-md", styles.bubble) : "rounded-bl-md bg-surface",
                )}
              >
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p
                  className={cn(
                    "mt-0.5 text-right text-[10px]",
                    mine ? "opacity-70" : "text-muted-foreground",
                  )}
                >
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border bg-surface p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2",
            styles.ring,
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim() || sending}
          className={cn("size-10 shrink-0 rounded-full", styles.button)}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
