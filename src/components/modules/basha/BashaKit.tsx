import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bath,
  BedDouble,
  CalendarDays,
  ChefHat,
  Flame,
  Home,
  Loader2,
  MapPin,
  Sofa,
  Sun,
  Wifi,
  Zap,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  BASHA_TYPE_LABELS,
  BASHA_TYPES,
  type BashaFacilities,
  type BashaFacilityKey,
  type BashaListing,
  type BashaType,
} from "@shared/types";
import { UNIVERSITIES } from "@shared/universities";
import { ImagesField, StatusPill, accent, formatDay } from "@/components/modules/ModuleKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, apiPost } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useMarketplace } from "@/lib/marketplace";
import { useTilt } from "@/lib/motion";
import { useRefreshModules } from "@/lib/modules";
import { cn } from "@/lib/utils";

export const FACILITY_META: Record<BashaFacilityKey, { label: string; icon: LucideIcon }> = {
  attached_bathroom: { label: "Attached bathroom", icon: Bath },
  balcony: { label: "Balcony", icon: Sun },
  kitchen: { label: "Kitchen", icon: ChefHat },
  furnished: { label: "Furnished", icon: Sofa },
  electricity: { label: "Electricity", icon: Zap },
  water: { label: "Water", icon: Droplets },
  wifi: { label: "Wi-Fi", icon: Wifi },
  gas: { label: "Gas", icon: Flame },
};

export const universityShort = (slug: string) =>
  UNIVERSITIES.find((u) => u.slug === slug)?.short_name ?? slug.toUpperCase();

export function BashaCard({ l, className }: { l: BashaListing; className?: string }) {
  const tilt = useTilt<HTMLElement>(4);
  const on = (Object.keys(FACILITY_META) as BashaFacilityKey[]).filter((k) => l.facilities[k]);
  return (
    <article
      ref={tilt}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-bloom)] [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:border-basha/40 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-basha-soft">
        {l.images[0] ? (
          <img
            src={l.images[0]}
            alt={l.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid size-full place-items-center text-basha">
            <Home className="size-9" aria-hidden="true" />
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-[8px] bg-basha px-2 py-1 text-[11px] font-semibold text-white">
          {BASHA_TYPE_LABELS[l.type]}
        </span>
        <span className="absolute bottom-3 left-3 rounded-[10px] bg-ink/85 px-2.5 py-1 text-sm font-semibold text-ink-foreground backdrop-blur-sm">
          {formatPrice(l.rent)}
          <span className="text-xs font-normal opacity-75">/month</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">
          <Link to="/basha/$listingId" params={{ listingId: l.id }}>
            <span className="absolute inset-0" aria-hidden="true" />
            {l.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" /> {l.area} · near{" "}
          {universityShort(l.university_slug)}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" /> Available from{" "}
          {formatDay(l.available_from)}
        </p>
        {on.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-2" aria-label="Facilities">
            {on.slice(0, 5).map((k) => {
              const { icon: Icon, label } = FACILITY_META[k];
              return (
                <li
                  key={k}
                  title={label}
                  className="inline-flex items-center gap-1 rounded-full bg-basha-soft px-2 py-0.5 text-[11px] text-basha"
                >
                  <Icon className="size-3" aria-hidden="true" /> {label}
                </li>
              );
            })}
            {on.length > 5 && (
              <li className="text-[11px] text-muted-foreground">+{on.length - 5}</li>
            )}
          </ul>
        )}
        {l.status !== "available" && (
          <div className="pt-1">
            <StatusPill status={l.status} />
          </div>
        )}
      </div>
    </article>
  );
}

// ---- Form -------------------------------------------------------------------

const selectClass =
  "h-9 w-full rounded-[10px] border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function YesNo({
  label,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-2">
      <span className="inline-flex items-center gap-2 text-sm">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {label}
      </span>
      <div
        className="inline-flex rounded-full border border-border p-0.5"
        role="radiogroup"
        aria-label={label}
      >
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
              value === v ? "bg-basha text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ml-6 flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-basha/40 bg-basha-soft/50 px-3 py-2 animate-rise">
      <span className="text-sm">{label}</span>
      <div className="inline-flex gap-1">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              value === v
                ? "border-basha bg-basha text-white"
                : "border-border bg-surface hover:bg-muted",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const emptyFacilities: BashaFacilities = {
  attached_bathroom: false,
  bathroom_type: null,
  balcony: false,
  kitchen: false,
  kitchen_type: null,
  furnished: false,
  electricity: true,
  water: true,
  wifi: false,
  gas: false,
  other: "",
  rules: "",
};

export function BashaForm({ existing }: { existing?: BashaListing }) {
  const navigate = useNavigate();
  const refresh = useRefreshModules();
  const marketplace = useMarketplace();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [type, setType] = useState<BashaType>(existing?.type ?? "single_room");
  const [rent, setRent] = useState(existing ? String(existing.rent) : "");
  const [advance, setAdvance] = useState(existing?.advance ? String(existing.advance) : "");
  const [from, setFrom] = useState(existing?.available_from.slice(0, 10) ?? "");
  const [university, setUniversity] = useState(existing?.university_slug ?? marketplace);
  const [area, setArea] = useState(existing?.area ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [addressPublic, setAddressPublic] = useState(existing?.address_public ?? false);
  const [mapUrl, setMapUrl] = useState(existing?.map_url ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [f, setF] = useState<BashaFacilities>(existing?.facilities ?? emptyFacilities);
  const [seats, setSeats] = useState(String(existing?.roommate?.available_seats ?? 1));
  const [current, setCurrent] = useState(String(existing?.roommate?.current_roommates ?? 0));
  const [preferred, setPreferred] = useState(existing?.roommate?.preferred_type ?? "");
  const [gender, setGender] = useState(existing?.roommate?.gender_preference ?? "");
  const [dept, setDept] = useState(existing?.roommate?.department_preference ?? "");
  const [reqs, setReqs] = useState(existing?.roommate?.requirements ?? "");
  const [busy, setBusy] = useState(false);

  const roomType = type !== "apartment";
  const setFacility = <K extends keyof BashaFacilities>(k: K, v: BashaFacilities[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (images.length === 0) return void toast.error("Add at least one photo of the place");
    if (f.attached_bathroom && !f.bathroom_type)
      return void toast.error("Choose a private or shared bathroom");
    if (f.kitchen && !f.kitchen_type) return void toast.error("Choose a private or shared kitchen");
    const body = {
      university_slug: university,
      title: title.trim(),
      type,
      rent: Number(rent),
      advance: advance ? Number(advance) : null,
      available_from: from,
      area: area.trim(),
      address: address.trim(),
      address_public: addressPublic,
      map_url: mapUrl.trim() || null,
      images,
      description: description.trim(),
      facilities: {
        ...f,
        bathroom_type: f.attached_bathroom ? f.bathroom_type : null,
        kitchen_type: f.kitchen ? f.kitchen_type : null,
      },
      roommate: roomType
        ? {
            available_seats: Number(seats),
            current_roommates: Number(current),
            preferred_type: preferred.trim(),
            gender_preference: gender.trim(),
            department_preference: dept.trim(),
            requirements: reqs.trim(),
          }
        : null,
    };
    setBusy(true);
    try {
      const id = existing
        ? (await apiPatch(`/basha/${existing.id}`, body), existing.id)
        : (await apiPost<BashaListing>("/basha", body)).id;
      await refresh();
      toast.success(existing ? "Listing updated" : "Your place is listed");
      void navigate({ to: "/basha/$listingId", params: { listingId: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-7 p-4 sm:p-6">
      <Section title="Basic information">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Listing type</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BASHA_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left text-sm transition-colors",
                  type === t
                    ? "border-basha bg-basha-soft text-basha"
                    : "border-input bg-surface hover:bg-muted",
                )}
              >
                {t === "apartment" ? <Home className="size-4" /> : <BedDouble className="size-4" />}
                {BASHA_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="bl-title">Listing title</Label>
          <Input
            id="bl-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Furnished single room 5 min from campus"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="bl-rent">Monthly rent (৳)</Label>
            <Input
              id="bl-rent"
              type="number"
              min={0}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bl-adv">Advance payment (৳, optional)</Label>
            <Input
              id="bl-adv"
              type="number"
              min={0}
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bl-from">Available from</Label>
            <Input
              id="bl-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bl-uni">University</Label>
            <select
              id="bl-uni"
              className={selectClass}
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            >
              {UNIVERSITIES.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bl-area">Location / area</Label>
            <Input
              id="bl-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={80}
              placeholder="e.g. Ashulia, Khagan, Birulia"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bl-address">Detailed address</Label>
          <Input
            id="bl-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            required
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={addressPublic}
              onChange={(e) => setAddressPublic(e.target.checked)}
              className="accent-[var(--color-basha)]"
            />
            Show the exact address publicly (otherwise only the area is shown; you can share it in
            messages)
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bl-map">Google Maps link (optional)</Label>
          <Input
            id="bl-map"
            type="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
          />
        </div>
        <ImagesField
          kind="basha"
          value={images}
          onChange={setImages}
          max={10}
          label="Property photos"
          disabled={busy}
        />
        <div className="space-y-1.5">
          <Label htmlFor="bl-desc">Detailed description</Label>
          <Textarea
            id="bl-desc"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={3000}
            placeholder="Rooms, floor, light, distance to campus, who else lives there"
            required
          />
        </div>
      </Section>

      <Section title="Facilities">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-2">
            <YesNo
              label="Attached bathroom"
              icon={Bath}
              value={f.attached_bathroom}
              onChange={(v) => setFacility("attached_bathroom", v)}
            />
            {f.attached_bathroom && (
              <Choice
                label="Bathroom type"
                value={f.bathroom_type}
                options={[
                  ["private", "Private"],
                  ["shared", "Shared"],
                ]}
                onChange={(v) => setFacility("bathroom_type", v)}
              />
            )}
          </div>
          <div className="space-y-2">
            <YesNo
              label="Kitchen"
              icon={ChefHat}
              value={f.kitchen}
              onChange={(v) => setFacility("kitchen", v)}
            />
            {f.kitchen && (
              <Choice
                label="Kitchen type"
                value={f.kitchen_type}
                options={[
                  ["private", "Private"],
                  ["shared", "Shared"],
                ]}
                onChange={(v) => setFacility("kitchen_type", v)}
              />
            )}
          </div>
          <YesNo
            label="Balcony"
            icon={Sun}
            value={f.balcony}
            onChange={(v) => setFacility("balcony", v)}
          />
          <YesNo
            label="Furnished"
            icon={Sofa}
            value={f.furnished}
            onChange={(v) => setFacility("furnished", v)}
          />
          <YesNo
            label="Electricity"
            icon={Zap}
            value={f.electricity}
            onChange={(v) => setFacility("electricity", v)}
          />
          <YesNo
            label="Water"
            icon={Droplets}
            value={f.water}
            onChange={(v) => setFacility("water", v)}
          />
          <YesNo
            label="Wi-Fi"
            icon={Wifi}
            value={f.wifi}
            onChange={(v) => setFacility("wifi", v)}
          />
          <YesNo label="Gas" icon={Flame} value={f.gas} onChange={(v) => setFacility("gas", v)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bl-other">Other facilities</Label>
            <Textarea
              id="bl-other"
              rows={3}
              value={f.other}
              onChange={(e) => setFacility("other", e.target.value)}
              maxLength={300}
              placeholder="e.g. lift, generator, rooftop, parking"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bl-rules">House rules</Label>
            <Textarea
              id="bl-rules"
              rows={3}
              value={f.rules}
              onChange={(e) => setFacility("rules", e.target.value)}
              maxLength={600}
              placeholder="e.g. gate closes at 11 pm, no smoking"
            />
          </div>
        </div>
      </Section>

      {roomType && (
        <div className="animate-rise">
          <Section title="Roommate details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bl-seats">Available seats</Label>
                <Input
                  id="bl-seats"
                  type="number"
                  min={1}
                  max={20}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bl-cur">Current number of roommates</Label>
                <Input
                  id="bl-cur"
                  type="number"
                  min={0}
                  max={20}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bl-pref">Preferred roommate type</Label>
                <Input
                  id="bl-pref"
                  value={preferred}
                  onChange={(e) => setPreferred(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. quiet, non-smoker, student"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bl-gender">Gender preference (optional)</Label>
                <Input
                  id="bl-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bl-dept">Department / student preference (optional)</Label>
                <Input
                  id="bl-dept"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bl-reqs">Additional requirements</Label>
                <Textarea
                  id="bl-reqs"
                  rows={3}
                  value={reqs}
                  onChange={(e) => setReqs(e.target.value)}
                  maxLength={400}
                />
              </div>
            </div>
          </Section>
        </div>
      )}

      <Button type="submit" size="lg" disabled={busy} className={accent.basha.button}>
        {busy && <Loader2 className="animate-spin" />}
        {existing ? "Save changes" : "Publish listing"}
      </Button>
    </form>
  );
}
