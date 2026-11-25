import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AdminPaymentSubmission,
  AdminStorePaymentRow,
  PaymentDisplayStatus,
  PlatformInvoice,
  SubmissionStatus,
} from "@shared/types";
import { AdminGate } from "@/components/admin/AdminGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import {
  dhakaDate,
  dhakaDateTime,
  lastDay,
  methodLabel,
  monthName,
  paymentStatusMeta,
  periodLabel,
  promotionStatusMeta,
  submissionStatusMeta,
  useAdminAudit,
  useAdminPaymentActions,
  useAdminPaymentConfig,
  useAdminPaymentsOverview,
  useAdminPromotions,
  useAdminStoreMonth,
  useAdminStorePayments,
  useAdminSubmissions,
} from "@/lib/payments";
import { storeStatusMeta } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/payments")({
  head: () => ({
    meta: [
      { title: "Payment Management — CampusCart Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <PaymentsAdmin />
    </AdminGate>
  ),
});

const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

type Tab = "pending" | "stores" | "promotions" | "config" | "audit";

function PaymentsAdmin() {
  const [tab, setTab] = useState<Tab>("pending");
  const [storeId, setStoreId] = useState<string | null>(null);
  const { data: overview } = useAdminPaymentsOverview();
  const { runBilling } = useAdminPaymentActions();
  const tabs: Array<{ id: Tab; label: string }> = [
    {
      id: "pending",
      label: `Pending verification${overview?.pending_count ? ` (${overview.pending_count})` : ""}`,
    },
    { id: "stores", label: "All stores" },
    { id: "promotions", label: "Promotions" },
    { id: "config", label: "bKash / Nagad" },
    { id: "audit", label: "Audit history" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Admin console
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Payment Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              5% monthly platform fees and featured promotions. All times are Bangladesh time.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={runBilling.isPending}
            onClick={() =>
              runBilling.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(
                    `Billing checked: ${r.invoices} new invoice(s), ${r.overdue} overdue, ${r.expired} promotion(s) ended.`,
                  ),
                onError: (e) => toast.error(errMsg(e, "Could not run billing.")),
              })
            }
          >
            <RefreshCw className={cn("size-3.5", runBilling.isPending && "animate-spin")} />
            Run billing check
          </Button>
        </div>

        <div role="tablist" className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "pending" && <SubmissionsPanel onOpenStore={setStoreId} />}
          {tab === "stores" && <StoresPanel onOpenStore={setStoreId} />}
          {tab === "promotions" && <PromotionsPanel onOpenStore={setStoreId} />}
          {tab === "config" && <ConfigPanel />}
          {tab === "audit" && <AuditList />}
        </div>
      </div>
      <StoreDetail storeId={storeId} onClose={() => setStoreId(null)} />
    </div>
  );
}

// ---- Pending verification -------------------------------------------------------------

function SubmissionsPanel({ onOpenStore }: { onOpenStore: (id: string) => void }) {
  const [status, setStatus] = useState<SubmissionStatus | "all">("pending_verification");
  const { data = [], isLoading } = useAdminSubmissions(status);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["pending_verification", "Waiting"],
            ["confirmed", "Confirmed"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold",
              status === id
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto my-10 size-5 animate-spin text-primary" />
      ) : data.length === 0 ? (
        <div className="card-surface px-4 py-10 text-center text-sm text-muted-foreground">
          {status === "pending_verification"
            ? "No payments are waiting for verification."
            : "No payments here yet."}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.map((s) => (
            <SubmissionCard key={s.id} s={s} onOpenStore={onOpenStore} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm font-medium", mono && "font-mono")}>{children}</dd>
    </div>
  );
}

function SubmissionCard({
  s,
  onOpenStore,
}: {
  s: AdminPaymentSubmission;
  onOpenStore: (id: string) => void;
}) {
  const { confirm, reject, note } = useAdminPaymentActions();
  const [mode, setMode] = useState<"none" | "confirm" | "reject" | "note">("none");
  const [amount, setAmount] = useState(String(s.submitted_amount));
  const [text, setText] = useState("");
  const meta = submissionStatusMeta[s.status];
  const diff = s.amount_difference;
  const waiting = s.status === "pending_verification";

  return (
    <li className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onOpenStore(s.store_id)}
            className="truncate text-sm font-semibold hover:text-primary"
          >
            {s.store_name}
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {s.seller_name} · {s.seller_email}
          </p>
        </div>
        <Chip className={meta.className}>{meta.label}</Chip>
      </div>

      <p className="mt-2 text-sm font-medium">
        {s.type === "platform_fee" ? s.label : `${s.package_name} (featured promotion)`}
      </p>
      {s.products.length > 0 && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          Products: {s.products.map((p) => p.name).join(", ")}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Field label="Expected">{formatPrice(s.expected_amount)}</Field>
        <Field label="Seller says sent">
          <span className={cn(diff !== 0 && "text-destructive")}>
            {formatPrice(s.submitted_amount)}
          </span>
        </Field>
        <Field label="Method">{methodLabel(s.method)}</Field>
        <Field label="Sender number" mono>
          {s.sender_phone}
        </Field>
        <Field label="Received on" mono>
          {s.receiver_number}
        </Field>
        <Field label="TrxID" mono>
          {s.trx_id}
        </Field>
        <Field label="Submitted">{dhakaDateTime(s.submitted_at)}</Field>
        {s.verified_at && <Field label="Reviewed">{dhakaDateTime(s.verified_at)}</Field>}
        {s.verified_amount !== null && (
          <Field label="Verified amount">{formatPrice(s.verified_amount)}</Field>
        )}
      </dl>
      {diff !== 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {formatPrice(Math.abs(diff))} {diff > 0 ? "more" : "less"} than expected — check what
          actually arrived.
        </p>
      )}
      {s.rejection_reason && (
        <p className="mt-2 text-xs text-destructive">Rejected: {s.rejection_reason}</p>
      )}
      {s.admin_note && <p className="mt-1 text-xs text-muted-foreground">Note: {s.admin_note}</p>}

      {mode === "none" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {waiting && (
            <>
              <Button size="sm" onClick={() => setMode("confirm")}>
                <CheckCircle2 className="size-4" /> Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode("reject")}>
                <XCircle className="size-4" /> Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setMode("note")}>
            Add note
          </Button>
        </div>
      )}

      {mode === "confirm" && (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3">
          <p className="text-xs">
            Only confirm after you've found TrxID{" "}
            <span className="font-mono font-semibold">{s.trx_id}</span> from {s.sender_phone} in the{" "}
            {methodLabel(s.method)} account {s.receiver_number}.
          </p>
          <Label htmlFor={`va-${s.id}`} className="text-xs">
            Amount actually received (৳)
          </Label>
          <Input
            id={`va-${s.id}`}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-base"
          />
          {Number(amount) < s.expected_amount && (
            <p className="text-xs text-destructive">
              Less than the expected {formatPrice(s.expected_amount)} — consider rejecting instead.
            </p>
          )}
          <Textarea
            placeholder="Internal note (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={confirm.isPending || amount === ""}
              onClick={() =>
                confirm.mutate(
                  { id: s.id, verified_amount: Number(amount), note: text.trim() || undefined },
                  {
                    onSuccess: () =>
                      toast.success(
                        s.type === "promotion"
                          ? "Payment confirmed — promotion activated."
                          : "Payment confirmed — fee marked paid.",
                      ),
                    onError: (e) => toast.error(errMsg(e, "Could not confirm.")),
                  },
                )
              }
            >
              {confirm.isPending && <Loader2 className="size-4 animate-spin" />} Confirm payment
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3">
          <Label htmlFor={`rr-${s.id}`} className="text-xs">
            Reason (the seller sees this)
          </Label>
          <Textarea
            id={`rr-${s.id}`}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. No transaction with this TrxID was received."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={reject.isPending || text.trim().length < 3}
              onClick={() =>
                reject.mutate(
                  { id: s.id, reason: text.trim() },
                  {
                    onSuccess: () => toast.success("Payment rejected; the seller has been told."),
                    onError: (e) => toast.error(errMsg(e, "Could not reject.")),
                  },
                )
              }
            >
              Reject payment
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "note" && (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Internal note (admins only)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={note.isPending || !text.trim()}
              onClick={() =>
                note.mutate(
                  { id: s.id, note: text.trim() },
                  {
                    onSuccess: () => (toast.success("Note saved."), setMode("none")),
                    onError: (e) => toast.error(errMsg(e, "Could not save.")),
                  },
                )
              }
            >
              Save note
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

// ---- All stores overview ----------------------------------------------------------------

const FILTERS = [
  ["all", "All Stores"],
  ["paid", "Paid"],
  ["unpaid", "Unpaid"],
  ["submitted", "Payment Submitted"],
  ["overdue", "Overdue"],
  ["suspended", "Suspended"],
  ["promotion", "Active Promotion"],
] as const;
type Filter = (typeof FILTERS)[number][0];

function matches(r: AdminStorePaymentRow, f: Filter) {
  const unpaid: PaymentDisplayStatus[] = ["pending", "overdue", "rejected"];
  switch (f) {
    case "all":
      return true;
    case "paid":
      return r.payment_status === "paid";
    case "unpaid":
      return unpaid.includes(r.payment_status);
    case "submitted":
      return r.has_pending_submission || r.payment_status === "submitted";
    case "overdue":
      return r.payment_status === "overdue";
    case "suspended":
      return r.store_status === "suspended";
    case "promotion":
      return !!r.active_promotion;
  }
}

function StoresPanel({ onOpenStore }: { onOpenStore: (id: string) => void }) {
  const { data, isLoading } = useAdminPaymentsOverview();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.stores ?? []).filter(
      (r) =>
        matches(r, filter) &&
        (!term ||
          `${r.store_name} ${r.seller_name} ${r.seller_email}`.toLowerCase().includes(term)),
    );
  }, [data, q, filter]);

  if (isLoading || !data)
    return <Loader2 className="mx-auto my-10 size-5 animate-spin text-primary" />;
  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search store or seller"
          className="pl-9 text-base md:text-sm"
        />
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold",
              filter === id
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {label} ({(data.stores ?? []).filter((r) => matches(r, id)).length})
          </button>
        ))}
      </div>

      <div className="card-surface mt-3 overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Store</th>
              <th className="px-3 py-2.5 font-medium">Seller</th>
              <th className="px-3 py-2.5 font-medium">Created</th>
              <th className="px-3 py-2.5 font-medium">Store status</th>
              <th className="px-3 py-2.5 text-right font-medium">
                {monthName(data.current_month)} sales
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                {monthName(data.previous_month)} sales
              </th>
              <th className="px-3 py-2.5 text-right font-medium">Fee (5%)</th>
              <th className="px-3 py-2.5 font-medium">Payment</th>
              <th className="px-3 py-2.5 font-medium">Last paid</th>
              <th className="px-3 py-2.5 font-medium">Promotion</th>
              <th className="px-3 py-2.5 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  No stores match.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const st = storeStatusMeta[r.store_status];
              const pay = paymentStatusMeta[r.payment_status];
              return (
                <tr key={r.store_id} className="align-top">
                  <td className="px-3 py-2.5 font-medium">{r.store_name}</td>
                  <td className="px-3 py-2.5">
                    {r.seller_name}
                    <span className="block text-xs text-muted-foreground">{r.seller_email}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{dhakaDate(r.store_created_at)}</td>
                  <td className="px-3 py-2.5">
                    <Chip className={st.className}>{st.label}</Chip>
                    {r.fee_suspended && (
                      <span className="mt-1 block text-[11px] text-destructive">Unpaid fee</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">{formatPrice(r.current_month_sales)}</td>
                  <td className="px-3 py-2.5 text-right">{formatPrice(r.previous_month_sales)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {formatPrice(r.previous_month_fee)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Chip className={pay.className}>{pay.label}</Chip>
                    {r.has_pending_submission && r.payment_status !== "submitted" && (
                      <span className="mt-1 block text-[11px] text-basha">Payment waiting</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {r.last_payment_at ? dhakaDate(r.last_payment_at) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.active_promotion ? (
                      <>
                        {r.active_promotion.package_name}
                        <span className="block text-[11px] text-muted-foreground">
                          until {dhakaDateTime(r.active_promotion.expires_at)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="outline" onClick={() => onOpenStore(r.store_id)}>
                      Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Store detail (sheet) ---------------------------------------------------------------

function StoreDetail({ storeId, onClose }: { storeId: string | null; onClose: () => void }) {
  const { data, isLoading } = useAdminStorePayments(storeId);
  const [month, setMonth] = useState<string | null>(null);
  const { data: monthData, isFetching: monthLoading } = useAdminStoreMonth(storeId, month);
  const { publication } = useAdminPaymentActions();
  const [pubNote, setPubNote] = useState("");

  useEffect(() => {
    setMonth(null);
    setPubNote("");
  }, [storeId]);
  useEffect(() => {
    if (data && !month) setMonth(data.months[1]?.month ?? data.months[0]?.month ?? null);
  }, [data, month]);

  return (
    <Sheet open={!!storeId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {isLoading || !data ? (
          <Loader2 className="mx-auto mt-20 size-5 animate-spin text-primary" />
        ) : (
          <div className="space-y-6 pb-10">
            <SheetHeader>
              <SheetTitle>{data.store.name}</SheetTitle>
              <SheetDescription>
                {data.seller.name} · {data.seller.email} · {data.seller.phone} · opened{" "}
                {dhakaDate(data.store.created_at)}
              </SheetDescription>
            </SheetHeader>

            <section className="card-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Chip className={storeStatusMeta[data.store.status].className}>
                    {storeStatusMeta[data.store.status].label}
                  </Chip>
                  {data.store.fee_suspended && (
                    <span className="text-xs text-destructive">Unpublished for an unpaid fee</span>
                  )}
                </div>
              </div>
              {(data.store.status === "approved" || data.store.status === "suspended") && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Reason (logged)"
                    value={pubNote}
                    onChange={(e) => setPubNote(e.target.value)}
                    className="text-base md:text-sm"
                  />
                  <Button
                    size="sm"
                    variant={data.store.status === "approved" ? "destructive" : "default"}
                    disabled={publication.isPending || pubNote.trim().length < 3}
                    onClick={() =>
                      publication.mutate(
                        {
                          id: data.store.id,
                          action: data.store.status === "approved" ? "suspend" : "republish",
                          note: pubNote.trim(),
                        },
                        {
                          onSuccess: () => (toast.success("Store updated."), setPubNote("")),
                          onError: (e) => toast.error(errMsg(e, "Could not update.")),
                        },
                      )
                    }
                  >
                    {data.store.status === "approved" ? "Unpublish store" : "Re-publish store"}
                  </Button>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Sales &amp; fee for a month</h3>
              <div className="card-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="month-pick" className="text-xs">
                    Month
                  </Label>
                  <Input
                    id="month-pick"
                    type="month"
                    value={month ?? ""}
                    onChange={(e) => setMonth(e.target.value || null)}
                    className="w-44 text-base md:text-sm"
                  />
                  {monthLoading && <Loader2 className="size-4 animate-spin text-primary" />}
                </div>
                {monthData && (
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Period">
                      {monthData.period_start
                        ? periodLabel(monthData.period_start, monthData.period_end)
                        : "Store not open yet"}
                    </Field>
                    <Field label="Delivered sales">{formatPrice(monthData.eligible_sales)}</Field>
                    <Field label="Orders">{monthData.order_count}</Field>
                    <Field label="Fee (5%)">
                      {monthData.billable ? formatPrice(monthData.fee) : "Free (launch)"}
                    </Field>
                    {monthData.invoice && (
                      <>
                        <Field label="Deadline">{lastDay(monthData.invoice.due_at)}</Field>
                        <Field label="Status">
                          {paymentStatusMeta[monthData.invoice.display_status].label}
                        </Field>
                      </>
                    )}
                  </dl>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Monthly sales history</h3>
              <div className="card-surface overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 text-right font-medium">Eligible sales</th>
                      <th className="px-3 py-2 text-right font-medium">Fee</th>
                      <th className="px-3 py-2 font-medium">Deadline</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.months.map((m) => (
                      <tr key={m.month}>
                        <td className="px-3 py-2">{monthName(m.month)}</td>
                        <td className="px-3 py-2 text-right">{formatPrice(m.eligible_sales)}</td>
                        <td className="px-3 py-2 text-right">
                          {m.billable ? formatPrice(m.fee) : "Free"}
                        </td>
                        <td className="px-3 py-2">
                          {m.invoice && m.invoice.fee > 0 ? lastDay(m.invoice.due_at) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {m.invoice ? (
                            <Chip className={paymentStatusMeta[m.invoice.display_status].className}>
                              {paymentStatusMeta[m.invoice.display_status].label}
                            </Chip>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {m.billable ? "Not invoiced yet" : "Not billed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {data.invoices.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Invoices</h3>
                <ul className="space-y-2">
                  {data.invoices.map((inv) => (
                    <InvoiceAdminRow key={inv.id} inv={inv} />
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold">Payments</h3>
              {data.submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments submitted.</p>
              ) : (
                <ul className="space-y-3">
                  {data.submissions.map((s) => (
                    <SubmissionCard key={s.id} s={s} onOpenStore={() => {}} />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Featured promotions</h3>
              {data.promotions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No promotions purchased.</p>
              ) : (
                <ul className="space-y-2">
                  {data.promotions.map((p) => {
                    const meta = promotionStatusMeta(p);
                    return (
                      <li key={p.id} className="card-surface p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {p.package_name} · {formatPrice(p.price)}
                          </span>
                          <Chip className={meta.className}>{meta.label}</Chip>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.products.map((x) => x.name).join(", ")}
                        </p>
                        {p.starts_at && p.expires_at && (
                          <p className="mt-1 text-xs">
                            {dhakaDateTime(p.starts_at)} → {dhakaDateTime(p.expires_at)} (
                            {p.duration_hours} h)
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Audit log</h3>
              <AuditRows entries={data.audit} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InvoiceAdminRow({ inv }: { inv: PlatformInvoice }) {
  const { invoiceStatus } = useAdminPaymentActions();
  const [action, setAction] = useState<"paid" | "waived" | "pending" | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(String(inv.fee));
  const meta = paymentStatusMeta[inv.display_status];
  const options: Array<["paid" | "waived" | "pending", string]> =
    inv.status === "pending" || inv.status === "rejected"
      ? [
          ["paid", "Mark paid"],
          ["waived", "Waive"],
        ]
      : inv.status === "paid" || inv.status === "waived"
        ? [["pending", "Mark unpaid"]]
        : [];
  return (
    <li className="card-surface p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {monthName(inv.billing_month)} · {formatPrice(inv.fee)}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (5% of {formatPrice(inv.eligible_sales)},{" "}
            {periodLabel(inv.period_start, inv.period_end)})
          </span>
        </span>
        <Chip className={meta.className}>{meta.label}</Chip>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {inv.fee > 0 ? `Due ${lastDay(inv.due_at)}` : "No fee"}
        {inv.paid_at && ` · Paid ${formatPrice(inv.paid_amount ?? 0)} on ${dhakaDate(inv.paid_at)}`}
      </p>
      {options.length > 0 && !action && (
        <div className="mt-2 flex gap-2">
          {options.map(([id, label]) => (
            <Button key={id} size="sm" variant="outline" onClick={() => setAction(id)}>
              {label}
            </Button>
          ))}
        </div>
      )}
      {action && (
        <div className="mt-2 space-y-2 rounded-xl bg-muted/60 p-3">
          {action === "paid" && (
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-base md:text-sm"
              aria-label="Amount received"
            />
          )}
          <Input
            placeholder="Reason (required, logged)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-base md:text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={invoiceStatus.isPending || note.trim().length < 3}
              onClick={() =>
                invoiceStatus.mutate(
                  {
                    id: inv.id,
                    status: action,
                    note: note.trim(),
                    ...(action === "paid" ? { paid_amount: Number(amount) } : {}),
                  },
                  {
                    onSuccess: () => (
                      toast.success("Invoice updated."),
                      setAction(null),
                      setNote("")
                    ),
                    onError: (e) => toast.error(errMsg(e, "Could not update.")),
                  },
                )
              }
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAction(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

// ---- Promotions ------------------------------------------------------------------------

function PromotionsPanel({ onOpenStore }: { onOpenStore: (id: string) => void }) {
  const { data = [], isLoading } = useAdminPromotions();
  if (isLoading) return <Loader2 className="mx-auto my-10 size-5 animate-spin text-primary" />;
  if (data.length === 0)
    return (
      <div className="card-surface px-4 py-10 text-center text-sm text-muted-foreground">
        No promotions yet.
      </div>
    );
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Store</th>
            <th className="px-3 py-2.5 font-medium">Package</th>
            <th className="px-3 py-2.5 font-medium">Products</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Starts</th>
            <th className="px-3 py-2.5 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((p) => {
            const meta = promotionStatusMeta(p);
            return (
              <tr key={p.id} className="align-top">
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="font-medium hover:text-primary"
                    onClick={() => onOpenStore(p.store_id)}
                  >
                    {p.store_name}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  {p.package_name}
                  <span className="block text-xs text-muted-foreground">
                    {formatPrice(p.price)} · {p.duration_hours} h
                  </span>
                </td>
                <td className="max-w-[220px] px-3 py-2.5 text-xs text-muted-foreground">
                  {p.products.map((x) => x.name).join(", ")}
                </td>
                <td className="px-3 py-2.5">
                  <Chip className={meta.className}>{meta.label}</Chip>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {p.starts_at ? dhakaDateTime(p.starts_at) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {p.expires_at ? dhakaDateTime(p.expires_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- bKash / Nagad numbers ------------------------------------------------------------

function ConfigPanel() {
  const { data, isLoading } = useAdminPaymentConfig();
  const { saveConfig } = useAdminPaymentActions();
  const [form, setForm] = useState({
    bkash_number: "",
    nagad_number: "",
    bkash_enabled: false,
    nagad_enabled: false,
  });
  useEffect(() => {
    if (data)
      setForm({
        bkash_number: data.bkash_number,
        nagad_number: data.nagad_number,
        bkash_enabled: data.bkash_enabled,
        nagad_enabled: data.nagad_enabled,
      });
  }, [data]);
  if (isLoading) return <Loader2 className="mx-auto my-10 size-5 animate-spin text-primary" />;
  const row = (key: "bkash" | "nagad", label: string) => (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${key}-num`} className="text-sm font-semibold">
          {label} personal number
        </Label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {form[`${key}_enabled`] ? "Enabled" : "Disabled"}
          <Switch
            checked={form[`${key}_enabled`]}
            onCheckedChange={(v) => setForm((f) => ({ ...f, [`${key}_enabled`]: v }))}
          />
        </label>
      </div>
      <Input
        id={`${key}-num`}
        inputMode="tel"
        placeholder="01XXXXXXXXX"
        value={form[`${key}_number`]}
        onChange={(e) => setForm((f) => ({ ...f, [`${key}_number`]: e.target.value }))}
        className="mt-2 font-mono text-base"
      />
    </div>
  );
  return (
    <div className="max-w-lg space-y-3">
      <p className="text-sm text-muted-foreground">
        Sellers see only enabled methods, on their payment page. Buyers never see these numbers.
      </p>
      {row("bkash", "bKash")}
      {row("nagad", "Nagad")}
      <div className="flex items-center gap-3">
        <Button
          disabled={saveConfig.isPending}
          onClick={() =>
            saveConfig.mutate(form, {
              onSuccess: () => toast.success("Payment numbers saved."),
              onError: (e) => toast.error(errMsg(e, "Could not save.")),
            })
          }
        >
          {saveConfig.isPending && <Loader2 className="size-4 animate-spin" />} Save
        </Button>
        {data?.updated_at && (
          <span className="text-xs text-muted-foreground">
            Last changed {dhakaDateTime(data.updated_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---- Audit ---------------------------------------------------------------------------------

function AuditList() {
  const { data = [], isLoading } = useAdminAudit();
  if (isLoading) return <Loader2 className="mx-auto my-10 size-5 animate-spin text-primary" />;
  return <AuditRows entries={data} />;
}

function AuditRows({ entries }: { entries: import("@shared/types").PaymentAuditEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No entries yet.</p>;
  return (
    <ul className="card-surface divide-y divide-border">
      {entries.map((a) => (
        <li key={a.id} className="px-4 py-2.5 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
            <span className="text-xs text-muted-foreground">{dhakaDateTime(a.created_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {a.actor_name}
            {a.previous_status || a.new_status
              ? ` · ${a.previous_status ?? "—"} → ${a.new_status ?? "—"}`
              : ""}
          </p>
          {a.note && <p className="mt-0.5 text-xs">{a.note}</p>}
        </li>
      ))}
    </ul>
  );
}
