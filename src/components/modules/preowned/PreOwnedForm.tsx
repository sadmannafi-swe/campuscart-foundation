import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PREOWNED_CATEGORIES,
  PREOWNED_CONDITION_LABELS,
  PREOWNED_CONDITIONS,
  type PreOwnedCondition,
  type PreOwnedListing,
} from "@shared/types";
import { ImagesField, accent } from "@/components/modules/ModuleKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, apiPost } from "@/lib/api";
import { marketplaceName, useMarketplace } from "@/lib/marketplace";
import { useRefreshModules } from "@/lib/modules";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-[10px] border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Create or edit a Pre-Owned listing. */
export function PreOwnedForm({ existing }: { existing?: PreOwnedListing }) {
  const navigate = useNavigate();
  const refresh = useRefreshModules();
  const marketplace = useMarketplace();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [original, setOriginal] = useState(
    existing?.original_price ? String(existing.original_price) : "",
  );
  const [condition, setCondition] = useState<PreOwnedCondition | "">(existing?.condition ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category || !condition) return void toast.error("Choose a category and condition");
    if (images.length === 0) return void toast.error("Add at least one photo");
    const body = {
      university_slug: existing?.university_slug ?? marketplace,
      title: title.trim(),
      description: description.trim(),
      category,
      price: Number(price),
      original_price: original ? Number(original) : null,
      condition,
      images,
      location: location.trim(),
    };
    setBusy(true);
    try {
      const id = existing
        ? (await apiPatch(`/preowned/${existing.id}`, body), existing.id)
        : (await apiPost<PreOwnedListing>("/preowned", body)).id;
      await refresh();
      toast.success(existing ? "Listing updated" : "Your item is listed");
      void navigate({ to: "/preowned/$listingId", params: { listingId: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-5 p-4 sm:p-6">
      <ImagesField kind="preowned" value={images} onChange={setImages} max={8} disabled={busy} />

      <div className="space-y-1.5">
        <Label htmlFor="po-title">Product title</Label>
        <Input
          id="po-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Casio FX-991ES calculator"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="po-category">Category</Label>
          <select
            id="po-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
            required
          >
            <option value="" disabled>
              Choose a category
            </option>
            {PREOWNED_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium">Condition</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {PREOWNED_CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                aria-pressed={condition === c}
                className={cn(
                  "h-9 cursor-pointer rounded-[10px] border text-xs font-medium transition-colors",
                  condition === c
                    ? cn(accent.preowned.soft, accent.preowned.text, accent.preowned.border)
                    : "border-input bg-surface hover:bg-muted",
                )}
              >
                {PREOWNED_CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="po-price">Selling price (৳)</Label>
          <Input
            id="po-price"
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="po-original">Original price (৳, optional)</Label>
          <Input
            id="po-original"
            type="number"
            inputMode="numeric"
            min={0}
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="po-location">Location</Label>
          <Input
            id="po-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={80}
            placeholder="e.g. YKSG-1, Ashulia, Knowledge Tower"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="po-description">Description</Label>
        <Textarea
          id="po-description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="How long you've used it, any marks or faults, what's included"
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Listed in {marketplaceName(existing?.university_slug ?? marketplace)} Pre-Owned. Buyers
        contact you through CampusCart Messages; your phone and e-mail stay private.
      </p>

      <Button type="submit" size="lg" disabled={busy} className={accent.preowned.button}>
        {busy && <Loader2 className="animate-spin" />}
        {existing ? "Save changes" : "Publish listing"}
      </Button>
    </form>
  );
}
