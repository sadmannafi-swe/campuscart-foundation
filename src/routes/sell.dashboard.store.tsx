import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SellerShell, StoreAvatar } from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { storeCategories, storeStatusMeta, useSellerAccount, useUniversities } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/store")({
  component: SellerStore,
});

function SellerStore() {
  const { store, user } = useSellerAccount();
  const { data: universities = [] } = useUniversities();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(store?.description ?? "");
  const [contact, setContact] = useState(store?.contact_number ?? "");
  const [busy, setBusy] = useState(false);

  const uni = universities.find((u) => u.slug === store?.university_slug);
  const meta = store ? storeStatusMeta[store.status] : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!store) return;
    setBusy(true);
    const { error } = await supabase
      .from("stores")
      .update({ description: description.trim(), contact_number: contact.trim() })
      .eq("id", store.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Store updated");
      void queryClient.invalidateQueries({ queryKey: ["seller-account", user?.id] });
    }
  }

  return (
    <SellerShell title="Store">
      <div className="card-surface flex items-center gap-3 p-4">
        <StoreAvatar logoPath={store?.logo_path ?? null} name={store?.name ?? "CC"} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{store?.name}</p>
          <p className="text-xs text-muted-foreground">
            {uni?.name} · {store?.category}
          </p>
        </div>
        {meta && (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
            {meta.label}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Your store is publicly visible only inside {uni?.short_name ?? store?.university_slug}{" "}
        CampusCart while it is approved. Store name, category and university are managed by admin —
        contact support to change them.
      </p>

      <form onSubmit={onSubmit} className="card-surface mt-4 space-y-4 p-4">
        <div className="space-y-1.5">
          <Label>Store Category</Label>
          <Input value={store?.category ?? ""} readOnly disabled />
          <p className="text-[11px] text-muted-foreground">
            Available categories: {storeCategories.join(", ")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-desc">Store Description</Label>
          <Textarea
            id="st-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-contact">Contact Number</Label>
          <Input id="st-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </SellerShell>
  );
}
