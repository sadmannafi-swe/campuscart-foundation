import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, Megaphone, Receipt, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type {
  PlatformInvoice,
  PromotionPackage,
  SellerPaymentsOverview,
  SellerPromotion,
} from "@shared/types";
import { SellerShell } from "@/components/seller/SellerShell";
import { PaymentForm, type PaymentTarget } from "@/components/payments/PaymentForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
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
  useSellerPaymentActions,
  useSellerPayments,
} from "@/lib/payments";
import { useSellerAccount, useSellerProducts } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/payments")({
  component: SellerPaymentsPage,
});

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}
    >
      {children}
    </span>
  );
}

function SellerPaymentsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useSellerPayments(user?.id);
  const [target, setTarget] = useState<PaymentTarget | null>(null);

  return (
    <SellerShell title="Payments">
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : isError || !data ? (
        <div className="card-surface px-4 py-10 text-center text-sm text-destructive">
          Couldn't load your payments. Please refresh.
        </div>
      ) : (
        <div className="space-y-6">
          {data.fee_suspended && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-destructive">Your store is unpublished</p>
                <p className="mt-0.5 text-foreground/80">
                  A platform fee wasn't paid by its deadline, so buyers can't see your store right
                  now. Pay it below — your store is published again as soon as CampusCart confirms
                  the payment. Your products and orders are safe.
                </p>
              </div>
            </div>
          )}
          {data.methods.length === 0 && (
            <div
              role="status"
              className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm"
            >
              <p className="font-semibold">Payments are paused for a moment</p>
              <p className="mt-0.5 text-foreground/80">
                CampusCart hasn't switched on its bKash/Nagad numbers yet, so payments can't be
                submitted right now. Your requests are kept — come back soon and tap Pay.
              </p>
            </div>
          )}
          <PlatformFeeSection data={data} onPay={setTarget} />
          <PromotionsSection data={data} onPay={setTarget} />
          <HistorySection data={data} />
        </div>
      )}
      <PaymentForm target={target} methods={data?.methods ?? []} onClose={() => setTarget(null)} />
    </SellerShell>
  );
}

// ---- Monthly platform fee ------------------------------------------------------------------

function PlatformFeeSection({
  data,
  onPay,
}: {
  data: SellerPaymentsOverview;
  onPay: (t: PaymentTarget) => void;
}) {
  const cur = data.current_month;
  return (
    <section aria-labelledby="fee-h">
      <div className="mb-2 flex items-center gap-2">
        <Receipt className="size-4 text-primary" aria-hidden="true" />
        <h2 id="fee-h" className="text-base font-semibold">
          Monthly Sales &amp; Platform Fee
        </h2>
      </div>

      <div className="card-surface p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={`${monthName(cur.month)} sales`} value={formatPrice(cur.sales)} />
          <Stat label="Platform fee rate" value="5%" />
          <Stat
            label={cur.billable ? "Fee so far" : "Fee this month"}
            value={cur.billable ? formatPrice(cur.estimated_fee) : "Free"}
          />
          <Stat
            label="Payment window"
            value={cur.billable ? `1–10 ${monthName(nextMonth(cur.month)).split(" ")[0]}` : "—"}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {cur.billable ? (
            <>
              CampusCart charges 5% of your delivered sales each month (product prices only —
              delivery charges, cancelled and undelivered orders don't count). This month's fee is
              billed on 1 {monthName(nextMonth(cur.month))} and is due by the 10th.
            </>
          ) : (
            <>
              Launch offer: sales before January 2027 are free. The 5% platform fee starts with your
              January 2027 sales; the first payment is due 1–10 February 2027.
            </>
          )}
        </p>
      </div>

      {data.invoices.length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.invoices.map((inv) => (
            <InvoiceRow key={inv.id} inv={inv} onPay={onPay} />
          ))}
        </ul>
      )}
    </section>
  );
}

const nextMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InvoiceRow({ inv, onPay }: { inv: PlatformInvoice; onPay: (t: PaymentTarget) => void }) {
  const meta = paymentStatusMeta[inv.display_status];
  const payable = inv.status === "pending" || inv.status === "rejected";
  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{monthName(inv.billing_month)} platform fee</p>
          <p className="text-xs text-muted-foreground">
            Sales {periodLabel(inv.period_start, inv.period_end)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Chip className={meta.className}>{meta.label}</Chip>
          {inv.overdue && inv.display_status !== "overdue" && (
            <Chip className="bg-destructive/10 text-destructive">Overdue</Chip>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Eligible sales</dt>
          <dd className="font-medium">{formatPrice(inv.eligible_sales)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Fee ({inv.commission_percent}%)</dt>
          <dd className="font-semibold">{formatPrice(inv.fee)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Deadline</dt>
          <dd className="font-medium">{inv.fee > 0 ? lastDay(inv.due_at) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Paid</dt>
          <dd className="font-medium">
            {inv.paid_at ? `${formatPrice(inv.paid_amount ?? 0)} · ${dhakaDate(inv.paid_at)}` : "—"}
          </dd>
        </div>
      </dl>
      {inv.status === "submitted" && (
        <p className="mt-3 text-xs font-medium text-basha">
          Payment Submitted — Waiting for Admin Verification.
        </p>
      )}
      {payable && inv.fee > 0 && (
        <Button
          className="mt-3 w-full sm:w-auto"
          onClick={() =>
            onPay({
              type: "platform_fee",
              invoice_id: inv.id,
              title: `${monthName(inv.billing_month)} platform fee · 5% of ${formatPrice(inv.eligible_sales)}`,
              expected: inv.fee,
            })
          }
        >
          {inv.status === "rejected" ? "Submit corrected payment" : `Pay ${formatPrice(inv.fee)}`}
        </Button>
      )}
    </li>
  );
}

// ---- Featured promotions -------------------------------------------------------------------

function PromotionsSection({
  data,
  onPay,
}: {
  data: SellerPaymentsOverview;
  onPay: (t: PaymentTarget) => void;
}) {
  const [pkg, setPkg] = useState<PromotionPackage | null>(null);
  const canBuy = data.store_status === "approved";
  const payPromotion = (p: SellerPromotion) =>
    onPay({
      type: "promotion",
      promotion_id: p.id,
      title: `${p.package_name} · ${p.duration_days} days · ${p.products.length} product${p.products.length === 1 ? "" : "s"}`,
      expected: p.price,
    });
  const visible = data.promotions.filter((p) => p.status !== "cancelled");

  return (
    <section aria-labelledby="promo-h">
      <div className="mb-2 flex items-center gap-2">
        <Megaphone className="size-4 text-primary" aria-hidden="true" />
        <h2 id="promo-h" className="text-base font-semibold">
          Featured Promotion Packages
        </h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Feature your store in Featured Stores and your chosen products in Featured Products. The
        promotion starts when CampusCart confirms your payment and runs for the exact number of
        hours (3 days = 72 hours).
      </p>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {data.packages.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!canBuy}
            onClick={() => setPkg(p)}
            aria-pressed={pkg?.id === p.id}
            className={cn(
              "card-surface flex flex-col items-start gap-1 p-3 text-left transition-[border-color,box-shadow] disabled:opacity-60",
              pkg?.id === p.id
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/40",
            )}
          >
            <span className="text-sm font-semibold">{p.name}</span>
            <span className="font-display text-xl font-semibold">{formatPrice(p.price)}</span>
            <span className="text-xs text-muted-foreground">
              {p.days} days · up to {p.max_products} products
            </span>
          </button>
        ))}
      </div>
      {!canBuy && (
        <p className="mt-2 text-xs text-muted-foreground">
          Promotions are available while your store is published.
        </p>
      )}

      {pkg && canBuy && (
        <ProductPicker
          pkg={pkg}
          onCancel={() => setPkg(null)}
          onCreated={(p) => (setPkg(null), payPromotion(p))}
        />
      )}

      {visible.length > 0 && (
        <ul className="mt-4 space-y-2">
          {visible.map((p) => (
            <PromotionRow key={p.id} p={p} onPay={() => payPromotion(p)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProductPicker({
  pkg,
  onCancel,
  onCreated,
}: {
  pkg: PromotionPackage;
  onCancel: () => void;
  onCreated: (p: SellerPromotion) => void;
}) {
  const { store } = useSellerAccount();
  const { data: products = [], isLoading } = useSellerProducts(store?.id);
  const { createPromotion } = useSellerPaymentActions();
  const [selected, setSelected] = useState<string[]>([]);
  const active = products.filter((p) => p.is_active);
  const full = selected.length >= pkg.max_products;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : full ? s : [...s, id]));

  return (
    <div className="card-surface mt-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {pkg.name} · {pkg.days} days · {formatPrice(pkg.price)}
          </p>
          <p className="text-xs text-muted-foreground">
            Choose up to {pkg.max_products} of your products — {selected.length} of{" "}
            {pkg.max_products} selected.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto my-6 size-5 animate-spin text-primary" />
      ) : active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Publish a product first — only your active products can be promoted.
        </p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
          {active.map((p) => {
            const on = selected.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  disabled={!on && full}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
                    on ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {on && <Check className="size-3.5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatPrice(p.price)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm">
          Total <span className="font-semibold">{formatPrice(pkg.price)}</span>
        </p>
        <Button
          disabled={selected.length === 0 || createPromotion.isPending}
          onClick={async () => {
            try {
              onCreated(
                await createPromotion.mutateAsync({ package_id: pkg.id, product_ids: selected }),
              );
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not create the promotion.");
            }
          }}
        >
          {createPromotion.isPending && <Loader2 className="size-4 animate-spin" />}
          Continue to payment
        </Button>
      </div>
    </div>
  );
}

function PromotionRow({ p, onPay }: { p: SellerPromotion; onPay: () => void }) {
  const { cancelPromotion } = useSellerPaymentActions();
  const meta = promotionStatusMeta(p);
  const payable = p.status === "awaiting_payment" || p.status === "payment_rejected";
  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-bloom-ink" aria-hidden="true" />
          <p className="text-sm font-semibold">
            {p.package_name} · {formatPrice(p.price)}
          </p>
        </div>
        <Chip className={meta.className}>{meta.label}</Chip>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {p.products.map((x) => x.name).join(", ")}
      </p>
      {p.starts_at && p.expires_at && (
        <p className="mt-2 text-xs">
          {dhakaDateTime(p.starts_at)} →{" "}
          <span className="font-medium">{dhakaDateTime(p.expires_at)}</span>{" "}
          <span className="text-muted-foreground">({p.duration_hours} hours)</span>
        </p>
      )}
      {p.status === "payment_submitted" && (
        <p className="mt-2 text-xs font-medium text-basha">
          Payment Submitted — Waiting for Admin Verification.
        </p>
      )}
      {payable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={onPay}>
            {p.status === "payment_rejected"
              ? "Submit corrected payment"
              : `Pay ${formatPrice(p.price)}`}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={cancelPromotion.isPending}
            onClick={() =>
              cancelPromotion.mutate(p.id, {
                onSuccess: () => toast.success("Promotion request cancelled."),
                onError: (e) => toast.error(e instanceof Error ? e.message : "Could not cancel."),
              })
            }
          >
            Cancel request
          </Button>
        </div>
      )}
    </li>
  );
}

// ---- History -------------------------------------------------------------------------------

function HistorySection({ data }: { data: SellerPaymentsOverview }) {
  return (
    <section aria-labelledby="hist-h">
      <h2 id="hist-h" className="mb-2 text-base font-semibold">
        Payment History
      </h2>
      {data.submissions.length === 0 ? (
        <div className="card-surface px-4 py-8 text-center text-sm text-muted-foreground">
          Your submitted payments will appear here.
        </div>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Payment Type</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.submissions.map((s) => {
                const meta = submissionStatusMeta[s.status];
                return (
                  <tr key={s.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-2.5">{dhakaDate(s.submitted_at)}</td>
                    <td className="px-4 py-2.5">
                      {s.label}
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {s.trx_id}
                      </span>
                      {s.rejection_reason && (
                        <span className="block text-xs text-destructive">{s.rejection_reason}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      {formatPrice(s.submitted_amount)}
                    </td>
                    <td className="px-4 py-2.5">{methodLabel(s.method)}</td>
                    <td className="px-4 py-2.5">
                      <Chip className={meta.className}>{meta.label}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
