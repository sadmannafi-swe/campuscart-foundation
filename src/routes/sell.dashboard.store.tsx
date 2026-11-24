import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SellerShell, StoreAvatar } from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ImagePicker } from "@/components/common/ImagePicker";
import { storeCategories, storeStatusMeta, useSellerAccount, useUniversities } from "@/lib/seller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sell/dashboard/store")({
  component: SellerStore,
});

function SellerStore() {
  const { store } = useSellerAccount();
  const { refreshProfile } = useAuth();
  const { data: universities = [] } = useUniversities();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  // undefined = unchanged, null = remove, string = newly uploaded logo URL
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // Fill the form once the store has loaded (and again after each save).
  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setDescription(store.description);
    setContact(store.contact_number);
  }, [store]);

  const uni = universities.find((u) => u.slug === store?.university_slug);
  const meta = store ? storeStatusMeta[store.status] : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!store) return;
    if (name.trim().length < 2) return void toast.error("Enter a store name");
    if (!description.trim()) return void toast.error("Describe your store");
    if (contact.trim().length < 6) return void toast.error("Enter a valid contact number");
    setBusy(true);
    const error = await apiPatch("/seller/store", {
      name: name.trim(),
      description: description.trim(),
      contact_number: contact.trim(),
      ...(logo !== undefined ? { logo_url: logo } : {}),
    }).then(
      () => null,
      (e: Error) => e,
    );
    if (error) toast.error(error.message);
    else {
      // The store name and logo appear on listings, so refresh everything.
      await refreshProfile();
      setLogo(undefined);
      toast.success("Store updated");
    }
    setBusy(false);
  }

  return (
    <SellerShell title="Store">
      <div className="card-surface flex items-center gap-3 p-4">
        <StoreAvatar
          logoPath={store?.logo_path ?? null}
          name={store?.name ?? "CC"}
          className="size-12"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{store?.name}</p>
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
        CampusCart while it is approved. Category and university are managed by admin — contact
        support to change them.
      </p>

      <form onSubmit={onSubmit} className="card-surface mt-4 space-y-4 p-4">
        <ImagePicker
          kind="store-logo"
          shape="square"
          label="Store logo"
          previewUrl={logo === null ? null : (logo ?? store?.logo_path ?? null)}
          fallback={(name || store?.name || "CC").slice(0, 2).toUpperCase()}
          onUploaded={setLogo}
          onRemove={() => setLogo(null)}
          disabled={busy || !store}
        />
        <div className="space-y-1.5">
          <Label htmlFor="st-name">Store Name</Label>
          <Input
            id="st-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
        </div>
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
          <Input
            id="st-contact"
            type="tel"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={20}
            required
          />
        </div>
        <Button type="submit" disabled={busy || !store}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </SellerShell>
  );
}
