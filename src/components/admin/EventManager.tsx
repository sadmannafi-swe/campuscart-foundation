import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ImageUp, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MarketplaceEvent } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useUniversities } from "@/lib/seller";
import {
  uploadEventBanner,
  useAdminEvents,
  useEventMutations,
  type EventInput,
} from "@/lib/events";
import { cn } from "@/lib/utils";

interface FeaturableProduct {
  id: string;
  name: string;
  price: number;
  store_id: string;
  university_slug: string;
  featured_university_slug: string | null;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/**
 * Admin: homepage events. An event is a banner plus existing products (references,
 * never copies). One event per marketplace can be active; activating one turns off
 * the others. The server enforces all of this; this is just the editor.
 */
export function EventManager() {
  const { data: events = [], isLoading } = useAdminEvents();
  const { update, remove } = useEventMutations();
  const { data: universities = [] } = useUniversities();
  const [editing, setEditing] = useState<MarketplaceEvent | "new" | null>(null);
  const uniName = (slug: string) => universities.find((u) => u.slug === slug)?.short_name ?? slug;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Homepage events</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The active event replaces the campus banner and shows its products first.
          </p>
        </div>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden="true" />
            New event
          </Button>
        )}
      </div>

      {editing !== null && (
        <EventEditor event={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      )}

      {isLoading ? (
        <div className="mt-4 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : events.length === 0 && editing === null ? (
        <p className="card-surface mt-4 p-6 text-center text-sm text-muted-foreground">
          No events yet. The homepage shows the DIU campus banner.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {events.map((e) => (
            <li key={e.id} className="card-surface flex flex-wrap items-center gap-3 p-3">
              <img
                src={e.banner_url}
                alt=""
                className="aspect-[16/5] w-28 shrink-0 rounded-lg bg-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  <span className="truncate">{e.title}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      e.is_active ? "bg-accent-soft text-accent" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.is_active ? "Active" : "Inactive"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {uniName(e.university_slug)} · {e.product_ids.length} product
                  {e.product_ids.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={e.is_active ? "outline" : "default"}
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: e.id, is_active: !e.is_active },
                      {
                        onSuccess: () =>
                          toast.success(e.is_active ? "Event deactivated." : "Event is live."),
                        onError: (err) => toast.error(errorText(err)),
                      },
                    )
                  }
                >
                  {e.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(e)}
                  aria-label={`Edit ${e.title}`}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  aria-label={`Delete ${e.title}`}
                  onClick={() => {
                    if (
                      !window.confirm(`Delete the event “${e.title}”? Products are not affected.`)
                    )
                      return;
                    remove.mutate(e.id, {
                      onSuccess: () => toast.success("Event deleted."),
                      onError: (err) => toast.error(errorText(err)),
                    });
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventEditor({ event, onDone }: { event: MarketplaceEvent | null; onDone: () => void }) {
  const { create, update } = useEventMutations();
  const { data: universities = [] } = useUniversities();
  const { data: allProducts = [] } = useQuery({
    queryKey: ["cc-admin-feat-products"],
    queryFn: () => api<FeaturableProduct[]>("/admin/featurable-products"),
  });
  const [form, setForm] = useState<EventInput>({
    university_slug: event?.university_slug ?? "diu",
    title: event?.title ?? "",
    description: event?.description ?? "",
    banner_url: event?.banner_url ?? "",
    product_ids: event?.product_ids ?? [],
    is_active: event?.is_active ?? true,
  });
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const saving = create.isPending || update.isPending;
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const products = useMemo(
    () => allProducts.filter((p) => p.university_slug === form.university_slug),
    [allProducts, form.university_slug],
  );
  const byId = useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);
  const matches = products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const toggleProduct = (id: string) =>
    set(
      "product_ids",
      form.product_ids.includes(id)
        ? form.product_ids.filter((x) => x !== id)
        : [...form.product_ids, id],
    );

  async function onBanner(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      set("banner_url", await uploadEventBanner(file));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 3) return void toast.error("Give the event a title.");
    if (!form.banner_url) return void toast.error("Upload a banner image.");
    // keep only products still in this marketplace (e.g. after switching university)
    const body = { ...form, product_ids: form.product_ids.filter((id) => byId.has(id)) };
    const opts = {
      onSuccess: () => {
        toast.success(event ? "Event updated." : "Event created.");
        onDone();
      },
      onError: (err: unknown) => toast.error(errorText(err)),
    };
    if (event) update.mutate({ id: event.id, ...body }, opts);
    else create.mutate(body, opts);
  }

  return (
    <form onSubmit={onSubmit} className="card-surface mt-4 space-y-4 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="size-4 text-primary" aria-hidden="true" />
        {event ? "Edit event" : "New event"}
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="ev-title">Title</Label>
          <Input
            id="ev-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={100}
            placeholder="e.g. Eid Bazaar"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-uni">Marketplace</Label>
          <select
            id="ev-uni"
            value={form.university_slug}
            onChange={(e) => set("university_slug", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-base md:text-sm"
          >
            {universities.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.short_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-desc">Description (optional)</Label>
        <Textarea
          id="ev-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={500}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Banner image</Label>
        <div className="flex flex-wrap items-center gap-3">
          {form.banner_url ? (
            <img
              src={form.banner_url}
              alt="Banner preview"
              className="aspect-[16/5] w-56 rounded-lg bg-muted object-cover"
            />
          ) : (
            <span className="grid aspect-[16/5] w-56 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              1600×500 · keep text near the middle
            </span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImageUp className="size-4" aria-hidden="true" />
            )}
            {form.banner_url ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void onBanner(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-search">
          Event products ({form.product_ids.filter((id) => byId.has(id)).length} selected)
        </Label>
        {form.product_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.product_ids
              .filter((id) => byId.has(id))
              .map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleProduct(id)}
                  className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium hover:bg-destructive/15"
                  title="Remove"
                >
                  {byId.get(id)!.name} ×
                </button>
              ))}
          </div>
        )}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="ev-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this marketplace's products"
            className="pl-9"
          />
        </div>
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {matches.length === 0 && (
            <li className="p-3 text-xs text-muted-foreground">
              No live products from approved stores match.
            </li>
          )}
          {matches.slice(0, 100).map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60">
                <input
                  type="checkbox"
                  checked={form.product_ids.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="size-4 accent-[var(--color-primary)]"
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatPrice(p.price)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
        <span>
          <span className="font-medium">Active</span>
          <span className="block text-xs text-muted-foreground">
            Shown on the homepage now. Any other active event in this marketplace is turned off.
          </span>
        </span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {event ? "Save changes" : "Create event"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
