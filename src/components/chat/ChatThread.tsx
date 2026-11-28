import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { liveProductSlug } from "@/lib/liveCatalog";
import {
  markChatReadEverywhere,
  sendChatMessage,
  useChatMessages,
  type ChatConversation,
} from "@/lib/chat";
import { useSignedUrl } from "@/lib/seller";
import { cn } from "@/lib/utils";
import { flyPaperPlane } from "@/lib/motion";
import { useImageFallback } from "@/lib/useImageFallback";

export type ChatAccent = "buyer" | "seller";

const accentStyles: Record<ChatAccent, { bubble: string; button: string; ring: string }> = {
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

const contextMeta = {
  preowned: { label: "Pre-Owned", view: "View item", tone: "bg-preowned-soft text-preowned" },
  blood_request: { label: "Blood request", view: "View request", tone: "bg-blood-soft text-blood" },
  donor: { label: "Blood donor", view: "View donor", tone: "bg-blood-soft text-blood" },
  basha: { label: "BashaLagbe", view: "View place", tone: "bg-basha-soft text-basha" },
} as const;

/** Link to the listing/request/profile a module conversation is about. */
function ContextLink({
  conversation,
  className,
  children,
}: {
  conversation: ChatConversation;
  className: string;
  children: React.ReactNode;
}) {
  const id = conversation.context_id ?? "";
  switch (conversation.kind) {
    case "preowned":
      return (
        <Link to="/preowned/$listingId" params={{ listingId: id }} className={className}>
          {children}
        </Link>
      );
    case "blood_request":
      return (
        <Link to="/blood/requests/$requestId" params={{ requestId: id }} className={className}>
          {children}
        </Link>
      );
    case "donor":
      return (
        <Link to="/blood/donors/$donorId" params={{ donorId: id }} className={className}>
          {children}
        </Link>
      );
    case "basha":
      return (
        <Link to="/basha/$listingId" params={{ listingId: id }} className={className}>
          {children}
        </Link>
      );
    default:
      return (
        <Link
          to="/products/$productSlug"
          params={{
            productSlug: liveProductSlug(conversation.product_name, conversation.product_id),
          }}
          className={className}
        >
          {children}
        </Link>
      );
  }
}

function ProductContextCard({
  conversation,
  accent,
}: {
  conversation: ChatConversation;
  accent: ChatAccent;
}) {
  const { data: imageUrl } = useSignedUrl(conversation.product_image);
  const img = useImageFallback(imageUrl);
  const kind = conversation.kind ?? "product";
  const meta = kind === "product" ? null : contextMeta[kind];
  const amount = Number(conversation.product_price);
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
        {img.showImage && imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" onError={img.onError} />
        ) : (
          conversation.product_name.slice(0, 2).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        {meta && (
          <span
            className={cn(
              "mb-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
              meta.tone,
            )}
          >
            {meta.label}
          </span>
        )}
        <p className="truncate text-sm font-semibold">{conversation.product_name}</p>
        {kind === "product" || kind === "preowned" || kind === "basha" ? (
          <p
            className={cn(
              "text-xs font-semibold",
              accent === "buyer" ? "text-primary" : "text-accent",
            )}
          >
            {formatPrice(amount)}
            {kind === "basha" && (
              <span className="font-normal text-muted-foreground"> / month</span>
            )}
          </p>
        ) : null}
        {conversation.context_subtitle && (
          <p className="truncate text-[11px] text-muted-foreground">
            {conversation.context_subtitle}
          </p>
        )}
      </div>
      <ContextLink
        conversation={conversation}
        className={cn(
          "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
          accent === "buyer"
            ? "hover:border-primary hover:text-primary"
            : "hover:border-accent hover:text-accent",
        )}
      >
        {meta ? meta.view : "View Product"}
      </ContextLink>
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
  const queryClient = useQueryClient();
  const { data: messages = [], isSuccess } = useChatMessages(conversation.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const sentTimer = useRef<number>(0);
  // Messages already there when the thread opened don't animate; new ones rise in.
  const initialIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (isSuccess && !initialIds.current) initialIds.current = new Set(messages.map((m) => m.id));
  }, [isSuccess, messages]);
  useEffect(() => () => clearTimeout(sentTimer.current), []);

  useEffect(() => {
    // Opening the thread (and every new message while it's open) marks it read;
    // every unread badge updates immediately.
    void markChatReadEverywhere(queryClient, conversation.id);
  }, [queryClient, conversation.id, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    flyPaperPlane(sendRef.current);
    try {
      await sendChatMessage(conversation.id, body);
      setDraft("");
      setSent(true);
      clearTimeout(sentTimer.current);
      sentTimer.current = window.setTimeout(() => setSent(false), 1100);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat-messages", conversation.id] }),
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  const isModule = !!conversation.kind && conversation.kind !== "product";
  const viewerIsOwner = conversation.seller_user_id === viewerId;
  const otherName = isModule
    ? viewerIsOwner
      ? conversation.buyer_name
      : (conversation.owner_name ?? "Owner")
    : accent === "buyer"
      ? "Seller"
      : conversation.buyer_name;
  const subtitle = isModule
    ? conversation.kind === "blood_request"
      ? viewerIsOwner
        ? "About your blood request"
        : "Blood requester"
      : conversation.kind === "donor"
        ? viewerIsOwner
          ? "About your donor profile"
          : "Blood donor"
        : conversation.kind === "basha"
          ? viewerIsOwner
            ? "About your listing"
            : "Property owner"
          : viewerIsOwner
            ? "Interested buyer"
            : "Pre-Owned seller"
    : accent === "buyer"
      ? "Seller chat"
      : "Buyer chat";

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
          <p className="truncate text-sm font-semibold">{otherName}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <ProductContextCard conversation={conversation} accent={accent} />

      <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 px-3 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {viewerIsOwner
              ? "No messages yet."
              : isModule
                ? "Say hello. They'll see this conversation once you send the first message."
                : accent === "buyer"
                  ? "Say hello — the seller will see your conversation once you send the first message."
                  : "No messages yet."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          const isNew = !!initialIds.current && !initialIds.current.has(m.id);
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  isNew && (mine ? "msg-in origin-bottom-right" : "msg-in origin-bottom-left"),
                  mine ? cn("rounded-br-md", styles.bubble) : "rounded-bl-md bg-surface",
                )}
              >
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p
                  className={cn(
                    "mt-0.5 text-right text-[11px]",
                    mine ? "opacity-70" : "text-muted-foreground",
                  )}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
          enterKeyHint="send"
          autoComplete="off"
          aria-label="Message"
          // 16px on phones: iOS Safari zooms into inputs with smaller text
          className={cn(
            "h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base outline-none focus-visible:ring-2 lg:text-sm",
            styles.ring,
          )}
        />
        <Button
          ref={sendRef}
          type="submit"
          size="icon"
          disabled={!sent && (!draft.trim() || sending)}
          className={cn("size-10 shrink-0 rounded-full", styles.button)}
          aria-label={sent ? "Message sent" : "Send message"}
        >
          {sent ? (
            <Check key="sent" className="atc-pop size-4" strokeWidth={3} />
          ) : (
            <Send key="send" className={cn("size-4 transition-opacity", sending && "opacity-0")} />
          )}
        </Button>
      </form>
    </div>
  );
}
