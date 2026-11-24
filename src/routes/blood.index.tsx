import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Droplet, HeartHandshake, Plus, Search } from "lucide-react";
import { BLOOD_GROUPS } from "@shared/types";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EmptyState } from "@/components/common/StateBlocks";
import { ModuleHeader, accent } from "@/components/modules/ModuleKit";
import { BloodNotice, DonorCard, RequestCard } from "@/components/modules/blood/BloodKit";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useBloodRequests, useDonors, useMyDonorProfile } from "@/lib/modules";
import { cn } from "@/lib/utils";

type Search = {
  tab?: "requests" | "donors" | undefined;
  q?: string | undefined;
  blood_group?: string | undefined;
  location?: string | undefined;
  status?: string | undefined;
  sort?: string | undefined;
};
const str = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 80) : undefined);

export const Route = createFileRoute("/blood/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s["tab"] === "donors" ? "donors" : undefined,
    q: str(s["q"]),
    blood_group: str(s["blood_group"]),
    location: str(s["location"]),
    status: str(s["status"]),
    sort: str(s["sort"]),
  }),
  head: () => ({
    meta: [
      { title: "Blood Donation — CampusCart" },
      {
        name: "description",
        content: "Find blood donors and post blood requests within your campus community.",
      },
    ],
  }),
  component: BloodHome,
});

const field =
  "h-9 rounded-[10px] border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function BloodHome() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/blood/" });
  const { user } = useAuth();
  const { data: myDonor } = useMyDonorProfile(!!user);
  const tab = search.tab ?? "requests";
  const filters = { q: search.q, blood_group: search.blood_group, location: search.location };
  const requests = useBloodRequests({ ...filters, status: search.status, sort: search.sort });
  const donors = useDonors(filters);
  const [q, setQ] = useState(search.q ?? "");
  const [location, setLocation] = useState(search.location ?? "");

  const set = (patch: Partial<Search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const apply = (e: FormEvent) => {
    e.preventDefault();
    set({ q: q.trim() || undefined, location: location.trim() || undefined });
  };

  const tabs = [
    { id: "requests", label: "Blood Requests", icon: Droplet },
    { id: "donors", label: "Available Donors", icon: HeartHandshake },
  ] as const;
  const index = tabs.findIndex((t) => t.id === tab);
  const active = tab === "requests" ? requests : donors;

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <ModuleHeader
          tone="blood"
          icon={Droplet}
          eyebrow="Campus community"
          title="Blood Donation"
          description="Ask for blood or offer to give. Every conversation stays inside CampusCart."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/blood/donor">{myDonor ? "Edit donor profile" : "Become a donor"}</Link>
              </Button>
              <Button asChild className={accent.blood.button}>
                <Link to="/blood/requests/new">
                  <Plus /> Request blood
                </Link>
              </Button>
            </>
          }
        />
        <BloodNotice className="mb-5" />

        <div
          role="tablist"
          aria-label="Blood donation"
          className="relative mb-4 grid max-w-md grid-cols-2 rounded-full border border-border bg-surface p-1"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-blood transition-transform duration-500 ease-[var(--ease-bloom)]"
            style={{ transform: `translateX(${index * 100}%)` }}
          />
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() =>
                set({
                  tab: id === "donors" ? "donors" : undefined,
                  status: undefined,
                  sort: undefined,
                })
              }
              className={cn(
                "relative z-10 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                tab === id ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <form onSubmit={apply} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                tab === "requests" ? "Search hospital or details" : "Search name, department"
              }
              aria-label="Search"
              className="h-10 pl-9"
            />
          </div>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            aria-label="Location"
            className="h-10"
          />
          <Button type="submit" className="h-10">
            Search
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[undefined, ...BLOOD_GROUPS].map((g) => (
            <button
              key={g ?? "all"}
              type="button"
              onClick={() => set({ blood_group: g })}
              aria-pressed={search.blood_group === g}
              className={cn(
                "h-8 min-w-11 cursor-pointer rounded-full border px-3 font-display text-xs font-semibold transition-colors",
                search.blood_group === g
                  ? "border-blood bg-blood text-white"
                  : "border-border bg-surface hover:bg-blood-soft",
              )}
            >
              {g ?? "All groups"}
            </button>
          ))}
          {tab === "requests" && (
            <div className="ml-auto flex gap-2">
              <select
                aria-label="Status"
                className={field}
                value={search.status ?? ""}
                onChange={(e) => set({ status: e.target.value || undefined })}
              >
                <option value="">Active</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All</option>
              </select>
              <select
                aria-label="Sort"
                className={field}
                value={search.sort ?? ""}
                onChange={(e) => set({ sort: e.target.value || undefined })}
              >
                <option value="">Newest</option>
                <option value="needed_soon">Needed soonest</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-5">
          {active.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-32 rounded-[16px]" />
              ))}
            </div>
          ) : active.isError ? (
            <EmptyState
              title="Couldn't load this list"
              description="Check your connection and try again."
            />
          ) : tab === "requests" ? (
            (requests.data ?? []).length === 0 ? (
              <EmptyState title="No blood requests" description="Nothing matches right now." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {requests.data!.map((r, i) => (
                  <Reveal key={r.id} delay={(i % 4) * 60}>
                    <RequestCard r={r} />
                  </Reveal>
                ))}
              </div>
            )
          ) : (donors.data ?? []).length === 0 ? (
            <EmptyState
              title="No donors found"
              description="Register yourself and help someone on your campus."
              action={
                <Button asChild size="sm" className={accent.blood.button}>
                  <Link to="/blood/donor">Become a donor</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {donors.data!.map((d, i) => (
                <Reveal key={d.id} delay={(i % 6) * 50}>
                  <DonorCard d={d} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
