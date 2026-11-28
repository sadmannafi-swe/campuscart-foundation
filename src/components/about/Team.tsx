import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Crown,
  Globe,
  ImageIcon,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import type { SocialKind, SocialLink, TeamMember } from "@/data/team";
import { cn } from "@/lib/utils";

/*
 * "Meet the Team" (About Us). Styling lives in styles.css under `.team-*`:
 * per-card accent colours come from data-accent, entrance uses <Reveal>, and every
 * animation is transform/opacity/background only (no layout shift) and is switched
 * off with prefers-reduced-motion.
 */

// ---- Brand icons (official marks, drawn inline so they stay crisp) -------------------

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const SOCIAL: Record<
  SocialKind,
  { label: string; icon: (p: { className?: string }) => ReactNode }
> = {
  website: {
    label: "Website",
    icon: ({ className }) => <Globe className={className} aria-hidden="true" />,
  },
  facebook: { label: "Facebook", icon: FacebookIcon },
  linkedin: { label: "LinkedIn", icon: LinkedinIcon },
};

/** External profile link: new tab, no opener, no referrer. */
function ExternalLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className={className}
    >
      {children}
    </a>
  );
}

// ---- Profile photo / placeholder ---------------------------------------------------------

/**
 * Circular profile with the accent ring. Shows `member.photo` when set; otherwise a
 * clean image placeholder (no generated faces).
 */
export function ProfilePhoto({ member, size }: { member: TeamMember; size: "lg" | "md" }) {
  return (
    <span
      className={cn(
        "team-ring relative grid shrink-0 place-items-center rounded-full",
        size === "lg" ? "size-[7.5rem] p-[5px] sm:size-[8.5rem]" : "size-[6.5rem] p-[4px]",
      )}
    >
      <span className="grid size-full place-items-center rounded-full bg-surface p-[5px]">
        <span className="grid size-full place-items-center overflow-hidden rounded-full bg-ink text-ink-foreground dark:bg-[oklch(0.3_0.05_265)]">
          {member.photo ? (
            <img
              src={member.photo}
              alt={member.name}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <>
              <ImageIcon
                className={size === "lg" ? "size-10 sm:size-11" : "size-9"}
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="sr-only">Profile photo coming soon</span>
            </>
          )}
        </span>
      </span>
      {member.founder && (
        <Crown
          className="team-crown absolute -left-1 -top-1 size-9 fill-bloom text-bloom-ink sm:size-10"
          strokeWidth={1.6}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

function Responsibilities({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("text-[15px] leading-snug", className)}>
      {items.map((r) => (
        <li key={r} className="flex items-start gap-3 text-foreground/85">
          <Check
            className="mt-0.5 size-[18px] shrink-0 text-[oklch(0.58_0.15_150)]"
            strokeWidth={2.6}
            aria-hidden="true"
          />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

// ---- Founder -------------------------------------------------------------------------------

export function FounderCard({ member }: { member: TeamMember }) {
  return (
    <article
      data-accent={member.accent}
      className="team-card team-founder relative overflow-hidden rounded-[26px] border border-[var(--team-line)] bg-surface shadow-[var(--team-shadow)]"
    >
      {/* moving blue gradient panel on the left (top on phones) */}
      <span aria-hidden="true" className="team-founder-panel absolute" />
      {/* soft swoosh on the right, as in the reference */}
      <span aria-hidden="true" className="team-founder-swoosh absolute" />

      <div className="relative flex flex-col gap-6 p-5 pt-8 sm:p-8 lg:flex-row lg:items-center lg:gap-0 lg:p-0">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left lg:w-[54%] lg:py-9 lg:pl-[4.5%] lg:pr-8">
          <ProfilePhoto member={member} size="lg" />
          <div className="min-w-0">
            <span className="team-role inline-flex items-center gap-1.5 rounded-full bg-[var(--acc-soft)] px-3.5 py-1.5 text-sm font-semibold text-[var(--acc)]">
              <Star className="size-4 fill-current" aria-hidden="true" />
              Founder &amp; Lead
            </span>
            <h3 className="mt-3 font-display text-[1.65rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.9rem]">
              {member.name}
            </h3>
            <p className="mt-1 text-base text-muted-foreground sm:text-lg">{member.title}</p>
            <ul
              className="mt-4 flex flex-wrap items-center justify-center gap-y-2 sm:justify-start"
              aria-label={`${member.name}'s profiles`}
            >
              {member.links.map((l, i) => {
                const { label, icon: Icon } = SOCIAL[l.kind];
                return (
                  <li key={l.kind} className="flex items-center">
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className="mx-1.5 hidden h-5 w-px bg-[var(--team-line)] sm:block"
                      />
                    )}
                    <ExternalLink
                      href={l.url}
                      label={`${member.name} — ${label}`}
                      className="team-social group/s inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-1.5 py-1 text-sm font-semibold text-[var(--acc)] sm:gap-2 sm:px-2 sm:text-[15px]"
                    >
                      <Icon className="size-5 sm:size-[22px] transition-transform duration-300 ease-[var(--ease-bloom)] group-hover/s:-translate-y-0.5 group-hover/s:scale-110" />
                      {label}
                    </ExternalLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--team-line)] pt-6 lg:flex-1 lg:border-l lg:border-t-0 lg:py-10 lg:pl-[4%] lg:pr-[3%]">
          <Responsibilities
            items={member.responsibilities}
            className="grid gap-x-10 gap-y-4 sm:grid-flow-col sm:grid-cols-[auto_auto] sm:grid-rows-3 sm:justify-start lg:gap-x-12 [&_li]:whitespace-nowrap"
          />
        </div>
      </div>
    </article>
  );
}

// ---- Contributor ---------------------------------------------------------------------------

export function MemberCard({ member }: { member: TeamMember }) {
  const facebook = member.links.find((l) => l.kind === "facebook");
  return (
    <article
      data-accent={member.accent}
      className="team-card relative flex h-full flex-col items-center overflow-hidden rounded-[24px] border border-[var(--team-line)] bg-surface px-5 pb-7 pt-7 text-center shadow-[var(--team-shadow)] sm:px-6 xl:px-5"
    >
      {/* the soft diagonal brush behind the profile, as in the reference */}
      <span aria-hidden="true" className="team-brush absolute" />
      <ProfilePhoto member={member} size="md" />
      <h3 className="relative mt-4 font-display text-xl font-bold tracking-[-0.015em]">
        {member.name}
      </h3>
      <p className="team-role relative mt-2.5 inline-flex max-w-full items-center rounded-full bg-[var(--acc-soft)] px-4 py-1.5 text-[13px] font-semibold leading-snug text-[var(--acc)]">
        {member.title}
      </p>
      <Responsibilities
        items={member.responsibilities}
        className="relative mb-6 mt-5 w-full space-y-2.5 text-left"
      />
      {facebook && (
        <ExternalLink
          href={facebook.url}
          label={`${member.name} — Facebook profile`}
          className="team-profile-btn relative mt-auto inline-flex items-center gap-2 rounded-full border border-[var(--acc-line)] bg-surface px-5 py-2.5 text-sm font-semibold text-[var(--acc)]"
        >
          <FacebookIcon className="size-5" />
          Facebook Profile
          <ArrowRight className="team-arrow size-4" aria-hidden="true" />
        </ExternalLink>
      )}
    </article>
  );
}

// ---- Section -------------------------------------------------------------------------------

/** Background shapes: two waves, dot grids, a faint cart, and dashes by the heading. */
function Decorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="team-wave team-wave-tl absolute" />
      <span className="team-wave team-wave-br absolute" />
      <span
        className="team-dots team-float absolute right-[3%] top-8 h-16 w-28"
        style={{ "--d": "-3s" } as CSSProperties}
      />
      <span
        className="team-dots team-float absolute bottom-10 left-[2%] h-16 w-20"
        style={{ "--d": "-7s" } as CSSProperties}
      />
      <ShoppingCart
        className="team-float absolute right-[4%] top-28 hidden size-16 -rotate-12 text-[var(--team-faint)] lg:block"
        strokeWidth={1.5}
        style={{ "--d": "-5s" } as CSSProperties}
      />
    </div>
  );
}

export function TeamSection({ team }: { team: TeamMember[] }) {
  const founder = team.find((m) => m.founder);
  const members = team.filter((m) => !m.founder);
  return (
    <section
      aria-labelledby="team-h"
      className="team-section relative isolate overflow-hidden rounded-[32px] px-3 py-12 sm:px-8 sm:py-16 lg:px-12"
    >
      <Decorations />

      <header className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <span aria-hidden="true" className="team-rule h-px w-12 sm:w-24" />
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--team-blue)] px-5 py-2 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--team-blue)]">
              <Users className="size-5" aria-hidden="true" />
              Our Team
            </span>
            <span aria-hidden="true" className="team-rule h-px w-12 rotate-180 sm:w-24" />
          </div>
        </Reveal>
        <Reveal delay={90}>
          <h1
            id="team-h"
            className="relative mt-6 font-display text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-[3.4rem]"
          >
            <span aria-hidden="true" className="team-dash team-dash-l absolute hidden lg:block" />
            Meet the Team Behind <span className="team-gradient-text">CampusCart</span>
            <span aria-hidden="true" className="team-dash team-dash-r absolute hidden lg:block" />
          </h1>
        </Reveal>
        <Reveal delay={180}>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-foreground/75 sm:text-[17px]">
            CampusCart is built by a dedicated team working together to make campus shopping
            simpler, safer, and more convenient. From product development and design to quality
            assurance, security, and operations, every member contributes to building a better
            marketplace for students.
          </p>
        </Reveal>
      </header>

      <div className="relative mt-10 space-y-6 sm:mt-12">
        {founder && (
          <Reveal delay={280}>
            <FounderCard member={founder} />
          </Reveal>
        )}
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {members.map((m, i) => (
            <Reveal as="li" key={m.name} delay={380 + i * 110} className="h-full">
              <MemberCard member={m} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
