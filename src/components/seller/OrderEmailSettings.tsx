import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { isValidEmail } from "@/lib/email/mime";
import type { Seller } from "@/lib/seller";

/** Seller preference: receive a Gmail/e-mail with full order details for every new order. */
export function OrderEmailSettings({ seller }: { seller: Seller }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(seller.order_email_enabled);
  const [address, setAddress] = useState(seller.notification_email ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(seller.order_email_enabled);
    setAddress(seller.notification_email ?? "");
  }, [seller.order_email_enabled, seller.notification_email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed && !isValidEmail(trimmed)) {
      toast.error("Enter a valid e-mail address, or leave it empty to use your account e-mail.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("sellers")
      .update({ order_email_enabled: enabled, notification_email: trimmed || null })
      .eq("id", seller.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Order e-mail settings saved");
      void queryClient.invalidateQueries({ queryKey: ["seller-account"] });
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface mt-5 space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Mail className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">New order e-mails</p>
          <p className="text-xs text-muted-foreground">
            Get the buyer's name, phone, delivery address and items in your inbox the moment an
            order is placed.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Send me an e-mail for every new order"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="order-email">Send order e-mails to</Label>
        <Input
          id="order-email"
          type="email"
          inputMode="email"
          placeholder={seller.email}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={!enabled}
          maxLength={254}
        />
        <p className="text-[11px] text-muted-foreground">
          Leave empty to use your account e-mail ({seller.email}).
        </p>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save
      </Button>
    </form>
  );
}
