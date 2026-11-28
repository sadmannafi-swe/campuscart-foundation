import { Check, Facebook, Globe, Linkedin, type LucideIcon } from "lucide-react";
import type { SocialKind, SocialLink, TeamMember } from "@/data/team";
import { cn } from "@/lib/utils";

/** First letters of the first and last name: "Sadman Nahial Nafi" → "SN". */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Initials on the CampusCart navy with daffodil-yellow lettering (no photos). */
export function InitialsAvatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-ink font-display font-semibold text-bloom dark:bg-bloom dark:text-bloom-foreground",
        size === "lg"
          ? "size-20 text-2xl ring-4 ring-bloom/35 ring-offset-2 ring-offset-surface sm:size-24 sm:text-3xl"
          : "size-14 text-lg",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

const SOCIAL: Record<SocialKind, { label: string; icon: LucideIcon }> = {
  website: { label: "Website", icon: Globe },
  facebook: { label: "Facebook", icon: Facebook },
  linkedin: { label: "LinkedIn", icon: Linkedin },
};

/** Round icon links to a member's profiles; each opens in a new tab, safely. */
export function SocialLinks({ name, links }: { name: string; links: SocialLink[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${name}'s profiles`}>
      {links.map((l) => {
        const { label, icon: Icon } = SOCIAL[l.kind];
        return (
          <li key={l.kind}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} — ${label} (opens in a new tab)`}
              title={label}
              className="grid size-9 place-items-center rounded-full border border-border text-primary transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-4" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function Responsibilities({ items, columns }: { items: string[]; columns?: boolean }) {
  return (
    <ul
      className={cn(
        "space-y-1.5 text-sm",
        columns && "lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-1.5 lg:space-y-0",
      )}
    >
      {items.map((r) => (
        <li key={r} className="flex items-start gap-2 text-foreground/80">
          <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

const cardBase =
  "card-surface transition-[transform,box-shadow] duration-300 ease-[var(--ease-bloom)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]";

/** A team member. The founder's card is wider, with a larger avatar and a badge. */
export function TeamCard({ member }: { member: TeamMember }) {
  if (member.founder) {
    return (
      <article className={cn(cardBase, "relative overflow-hidden p-6 sm:p-8")}>
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-bloom" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="flex items-center gap-4 md:w-[20rem] md:shrink-0 lg:w-[26rem]">
            <InitialsAvatar name={member.name} size="lg" />
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-bloom-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bloom-ink">
                Founder
              </span>
              <h3 className="mt-1.5 font-display text-xl font-semibold leading-tight tracking-[-0.01em] sm:text-2xl">
                {member.name}
              </h3>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">{member.title}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <Responsibilities items={member.responsibilities} columns />
            <div className="mt-5">
              <SocialLinks name={member.name} links={member.links} />
            </div>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className={cn(cardBase, "flex h-full flex-col p-5")}>
      <div className="flex items-center gap-3.5">
        <InitialsAvatar name={member.name} />
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold leading-snug">{member.name}</h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{member.title}</p>
        </div>
      </div>
      <div className="mt-4 flex-1 border-t border-border pt-4">
        <Responsibilities items={member.responsibilities} />
      </div>
      <div className="mt-5">
        <SocialLinks name={member.name} links={member.links} />
      </div>
    </article>
  );
}
