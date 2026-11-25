import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PaymentMethod, PaymentMethodOption } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { methodLabel, useSellerPaymentActions } from "@/lib/payments";
import { cn } from "@/lib/utils";

export type PaymentTarget =
  | { type: "platform_fee"; invoice_id: string; title: string; expected: number }
  | { type: "promotion"; promotion_id: string; title: string; expected: number };

/**
 * bKash/Nagad payment submission. Store and seller details are attached by the
 * server from the signed-in account, so they're not fields here. The expected amount
 * comes from the server and is prefilled; the seller may change it, and a different
 * amount is shown to them (and flagged for the admin).
 */
export function PaymentForm({
  target,
  methods,
  onClose,
}: {
  target: PaymentTarget | null;
  methods: PaymentMethodOption[];
  onClose: () => void;
}) {
  const { submit } = useSellerPaymentActions();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setMethod(methods[0]?.method ?? null);
    setSender("");
    setTrx("");
    setAmount(String(target.expected));
    setConfirmed(false);
    setError(null);
  }, [target, methods]);

  const receiver = methods.find((m) => m.method === method);
  const amountNum = Number(amount);
  const differs = target && amount !== "" && Math.abs(amountNum - target.expected) > 0.001;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target || !method) return;
    setError(null);
    if (!confirmed) return setError("Please confirm that you have sent the money.");
    try {
      await submit.mutateAsync({
        ...(target.type === "platform_fee"
          ? { type: "platform_fee", invoice_id: target.invoice_id }
          : { type: "promotion", promotion_id: target.promotion_id }),
        method,
        sender_phone: sender,
        trx_id: trx,
        amount: amountNum,
        confirmed,
      });
      toast.success("Payment Submitted — Waiting for Admin Verification.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the payment.");
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit payment</DialogTitle>
          <DialogDescription>{target?.title}</DialogDescription>
        </DialogHeader>

        {methods.length === 0 ? (
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            Payment numbers aren't set up yet. Please check back soon or contact CampusCart.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-xl bg-bloom-soft p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">Amount to send</p>
              <p className="font-display text-2xl font-semibold">
                {formatPrice(target?.expected ?? 0)}
              </p>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Payment method</legend>
              <div className="grid grid-cols-2 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.method}
                    type="button"
                    onClick={() => setMethod(m.method)}
                    aria-pressed={method === m.method}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-semibold transition-colors",
                      method === m.method
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface hover:bg-muted",
                    )}
                  >
                    {methodLabel(m.method)}
                  </button>
                ))}
              </div>
            </fieldset>

            {receiver && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Send Money to this {methodLabel(receiver.method)} personal number
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-lg font-semibold tracking-wide">
                    {receiver.number}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(receiver.number);
                      toast.success("Number copied");
                    }}
                  >
                    <Copy className="size-3.5" aria-hidden="true" /> Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pay-sender">Your {method ? methodLabel(method) : ""} number</Label>
              <Input
                id="pay-sender"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="text-base"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                The number you sent the money from.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-trx">Transaction ID (TrxID)</Label>
              <Input
                id="pay-trx"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. 9BH4KX2N7Q"
                value={trx}
                onChange={(e) => setTrx(e.target.value.toUpperCase())}
                className="font-mono text-base"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                From the confirmation SMS or the app's transaction history.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount you sent (৳)</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-base"
                required
              />
              {differs && target && (
                <p className="flex items-start gap-1.5 text-xs text-warning-foreground">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  This is {formatPrice(Math.abs(amountNum - target.expected))}{" "}
                  {amountNum > target.expected ? "more" : "less"} than the expected{" "}
                  {formatPrice(target.expected)}. The admin will check the amount received.
                </p>
              )}
            </div>

            <label className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3 text-sm">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <span>
                I have sent {amount ? formatPrice(amountNum) : "the money"} to the{" "}
                {receiver
                  ? `${methodLabel(receiver.method)} number ${receiver.number}`
                  : "number above"}
                .
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submit.isPending || !method}
            >
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              )}
              Submit Payment
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Nothing is marked paid until CampusCart checks the payment.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
