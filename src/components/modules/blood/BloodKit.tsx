import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays, Hospital, Loader2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import {
  BLOOD_GROUPS,
  type BloodGroup,
  type BloodRequest,
  type ContactPreference,
  type DonorProfile,
} from "@shared/types";
import { StatusPill, accent, formatDay, timeAgo } from "@/components/modules/ModuleKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMarketplace } from "@/lib/marketplace";
import { useRefreshModules } from "@/lib/modules";
import { cn } from "@/lib/utils";

export const BLOOD_NOTICE =
  "CampusCart only connects blood requesters and potential donors. It is not an emergency medical service. Please verify donor availability and medical eligibility directly with the hospital or appropriate medical professionals.";

export function BloodNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-[14px] border border-blood/25 bg-blood-soft px-4 py-3 text-xs leading-relaxed text-foreground",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-blood" aria-hidden="true" />
      {BLOOD_NOTICE}
    </p>
  );
}

/** A blood-drop badge showing the group. */
export function BloodGroupBadge({ group, size = "md" }: { group: string; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center font-display font-semibold text-white",
        size === "lg" ? "size-20 text-2xl" : "size-12 text-sm",
      )}
      aria-label={`Blood group ${group}`}
    >
      <svg
        viewBox="0 0 40 48"
        className="absolute inset-0 size-full drop-shadow-sm"
        aria-hidden="true"
      >
        <path
          d="M20 2 C 20 2, 4 20, 4 31 a16 16 0 0 0 32 0 C 36 20, 20 2, 20 2 Z"
          fill="var(--color-blood)"
        />
      </svg>
      <span className="relative mt-2">{group}</span>
    </span>
  );
}

export function RequestCard({ r }: { r: BloodRequest }) {
  return (
    <article className="group relative flex gap-3 rounded-[16px] border border-border bg-surface p-4 transition-[box-shadow,border-color] duration-300 hover:border-blood/40 hover:shadow-[var(--shadow-card-hover)]">
      <BloodGroupBadge group={r.blood_group} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">
            <Link to="/blood/requests/$requestId" params={{ requestId: r.id }}>
              <span className="absolute inset-0" aria-hidden="true" />
              {r.blood_group} needed{r.patient_name ? ` for ${r.patient_name}` : ""}
            </Link>
          </h3>
          <StatusPill status={r.status} />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm">
          <Hospital className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{r.hospital_name}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {r.hospital_location}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Needed {formatDay(r.needed_on)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {r.donors_needed} donor{r.donors_needed > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Posted {timeAgo(r.created_at)} by {r.owner.name}
        </p>
      </div>
    </article>
  );
}

export function DonorCard({ d }: { d: DonorProfile }) {
  return (
    <article className="group relative flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4 transition-[box-shadow,border-color] duration-300 hover:border-blood/40 hover:shadow-[var(--shadow-card-hover)]">
      <BloodGroupBadge group={d.blood_group} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">
          <Link to="/blood/donors/$donorId" params={{ donorId: d.id }}>
            <span className="absolute inset-0" aria-hidden="true" />
            {d.name}
          </Link>
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {[d.department, d.batch].filter(Boolean).join(" · ") || "Student donor"}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" /> {d.location}
        </p>
      </div>
      <StatusPill
        status={d.availability === "available" ? "available" : "unavailable"}
        tone={d.availability === "available" ? "good" : "muted"}
      />
    </article>
  );
}

const selectClass =
  "h-9 w-full rounded-[10px] border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function GroupPicker({ value, onChange }: { value: string; onChange: (g: BloodGroup) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Blood group</legend>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {BLOOD_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={value === g}
            onClick={() => onChange(g)}
            className={cn(
              "h-10 cursor-pointer rounded-[10px] border font-display text-sm font-semibold transition-[background-color,color,transform] active:scale-95",
              value === g
                ? "border-blood bg-blood text-white"
                : "border-input bg-surface hover:bg-blood-soft",
            )}
          >
            {g}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ContactFields({
  pref,
  setPref,
  phone,
  setPhone,
}: {
  pref: ContactPreference;
  setPref: (p: ContactPreference) => void;
  phone: string;
  setPhone: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Contact preference</legend>
      {(
        [
          ["messages", "CampusCart messages only", "Your phone number and e-mail stay private."],
          ["phone", "Messages and a phone number", "The number you enter here is shown publicly."],
        ] as const
      ).map(([value, title, hint]) => (
        <label
          key={value}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-[12px] border px-3 py-2.5 transition-colors",
            pref === value ? "border-blood/40 bg-blood-soft" : "border-border hover:bg-muted/60",
          )}
        >
          <input
            type="radio"
            name="contact-pref"
            className="mt-1 accent-[var(--color-blood)]"
            checked={pref === value}
            onChange={() => setPref(value)}
          />
          <span>
            <span className="block text-sm font-medium">{title}</span>
            <span className="block text-xs text-muted-foreground">{hint}</span>
          </span>
        </label>
      ))}
      {pref === "phone" && (
        <div className="space-y-1.5 animate-rise">
          <Label htmlFor="contact-phone">Phone number to share</Label>
          <Input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            required
          />
        </div>
      )}
    </fieldset>
  );
}

export function BloodRequestForm({ existing }: { existing?: BloodRequest }) {
  const navigate = useNavigate();
  const refresh = useRefreshModules();
  const marketplace = useMarketplace();
  const [patient, setPatient] = useState(existing?.patient_name ?? "");
  const [group, setGroup] = useState<string>(existing?.blood_group ?? "");
  const [hospital, setHospital] = useState(existing?.hospital_name ?? "");
  const [location, setLocation] = useState(existing?.hospital_location ?? "");
  const [date, setDate] = useState(existing?.needed_on.slice(0, 10) ?? "");
  const [donors, setDonors] = useState(String(existing?.donors_needed ?? 1));
  const [pref, setPref] = useState<ContactPreference>(existing?.contact_preference ?? "messages");
  const [phone, setPhone] = useState(existing?.contact_phone ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [status, setStatus] = useState(existing?.status ?? "active");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!group) return void toast.error("Choose the blood group needed");
    const body = {
      university_slug: existing?.university_slug ?? marketplace,
      patient_name: patient.trim() || null,
      blood_group: group,
      hospital_name: hospital.trim(),
      hospital_location: location.trim(),
      needed_on: date,
      donors_needed: Number(donors),
      contact_preference: pref,
      contact_phone: pref === "phone" ? phone.trim() : null,
      description: description.trim(),
    };
    setBusy(true);
    try {
      let id = existing?.id;
      if (existing) {
        await apiPatch(`/blood/requests/${existing.id}`, body);
        if (status !== existing.status)
          await apiPatch(`/blood/requests/${existing.id}/status`, { status });
      } else {
        id = (await apiPost<BloodRequest>("/blood/requests", body)).id;
      }
      await refresh();
      toast.success(existing ? "Request updated" : "Request posted");
      void navigate({ to: "/blood/requests/$requestId", params: { requestId: id! } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-5 p-4 sm:p-6">
      <GroupPicker value={group} onChange={setGroup} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="br-patient">Patient name (optional)</Label>
          <Input
            id="br-patient"
            value={patient}
            onChange={(e) => setPatient(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="br-donors">Number of donors needed</Label>
          <Input
            id="br-donors"
            type="number"
            min={1}
            max={20}
            value={donors}
            onChange={(e) => setDonors(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="br-hospital">Hospital name</Label>
          <Input
            id="br-hospital"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="br-location">Hospital location</Label>
          <Input
            id="br-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={160}
            placeholder="Area, city"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="br-date">Date blood is needed</Label>
          <Input
            id="br-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        {existing && (
          <div className="space-y-1.5">
            <Label htmlFor="br-status">Request status</Label>
            <select
              id="br-status"
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="active">Active</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>
      <ContactFields pref={pref} setPref={setPref} phone={phone} setPhone={setPhone} />
      <div className="space-y-1.5">
        <Label htmlFor="br-desc">Additional details</Label>
        <Textarea
          id="br-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          placeholder="e.g. surgery time, ward, who to ask for at the hospital"
        />
      </div>
      <BloodNotice />
      <Button type="submit" size="lg" disabled={busy} className={accent.blood.button}>
        {busy && <Loader2 className="animate-spin" />}
        {existing ? "Save changes" : "Post request"}
      </Button>
    </form>
  );
}

export function DonorForm({ existing }: { existing: DonorProfile | null }) {
  const navigate = useNavigate();
  const refresh = useRefreshModules();
  const marketplace = useMarketplace();
  const { profile } = useAuth();
  const [name, setName] = useState(existing?.name ?? profile?.full_name ?? "");
  const [group, setGroup] = useState<string>(existing?.blood_group ?? "");
  const [department, setDepartment] = useState(existing?.department ?? profile?.department ?? "");
  const [batch, setBatch] = useState(existing?.batch ?? profile?.batch ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [pref, setPref] = useState<ContactPreference>(existing?.contact_preference ?? "messages");
  const [phone, setPhone] = useState(existing?.contact_phone ?? "");
  const [availability, setAvailability] = useState(existing?.availability ?? "available");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!group) return void toast.error("Choose your blood group");
    setBusy(true);
    try {
      const saved = await api<DonorProfile>("/blood/donors/me", {
        method: "PUT",
        body: {
          university_slug: existing?.university_slug ?? marketplace,
          name: name.trim(),
          blood_group: group,
          department: department.trim(),
          batch: batch.trim(),
          location: location.trim(),
          availability,
          contact_preference: pref,
          contact_phone: pref === "phone" ? phone.trim() : null,
        },
      });
      await refresh();
      toast.success(
        existing ? "Donor profile updated" : "You're registered as a donor. Thank you.",
      );
      void navigate({ to: "/blood/donors/$donorId", params: { donorId: saved.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your donor profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-5 p-4 sm:p-6">
      <GroupPicker value={group} onChange={setGroup} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dn-name">Name</Label>
          <Input
            id="dn-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dn-dept">Department</Label>
          <Input
            id="dn-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dn-batch">Batch</Label>
          <Input
            id="dn-batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dn-location">Current location</Label>
          <Input
            id="dn-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={80}
            placeholder="e.g. Ashulia, Savar"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dn-avail">Availability</Label>
          <select
            id="dn-avail"
            className={selectClass}
            value={availability}
            onChange={(e) => setAvailability(e.target.value as typeof availability)}
          >
            <option value="available">Available</option>
            <option value="unavailable">Temporarily unavailable</option>
          </select>
        </div>
      </div>
      <ContactFields pref={pref} setPref={setPref} phone={phone} setPhone={setPhone} />
      <BloodNotice />
      <Button type="submit" size="lg" disabled={busy} className={accent.blood.button}>
        {busy && <Loader2 className="animate-spin" />}
        {existing ? "Save donor profile" : "Become a donor"}
      </Button>
    </form>
  );
}
