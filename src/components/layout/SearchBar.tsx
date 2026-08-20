import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}

const rotatingHints = [
  "textbooks",
  "used laptops",
  "hostel essentials",
  "calculators",
  "campus stores",
  "headphones",
];

export function SearchBar({
  placeholder,
  defaultValue = "",
  className,
  autoFocus,
  onSubmitted,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const animateHints = !placeholder && !value && !focused;

  useEffect(() => {
    if (!animateHints) return;
    const word = rotatingHints[hintIndex];
    let i = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!deleting) {
        i += 1;
        setTyped(word.slice(0, i));
        if (i === word.length) {
          deleting = true;
          timer = setTimeout(tick, 1400);
          return;
        }
        timer = setTimeout(tick, 70);
      } else {
        i -= 1;
        setTyped(word.slice(0, i));
        if (i === 0) {
          setHintIndex((prev) => (prev + 1) % rotatingHints.length);
          return;
        }
        timer = setTimeout(tick, 35);
      }
    };

    timer = setTimeout(tick, 220);
    return () => clearTimeout(timer);
  }, [animateHints, hintIndex]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate({ to: "/products", search: { q: value || undefined, category: undefined, sort: undefined } });
    onSubmitted?.();
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn("group/search relative w-full", className)}
    >
      <label htmlFor="site-search" className="sr-only">
        Search CampusCart
      </label>

      {/* animated gradient halo */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-[2px] rounded-full opacity-0 blur-[6px] transition-opacity duration-500",
          "bg-[conic-gradient(from_0deg,var(--color-primary),var(--color-accent),var(--color-primary))]",
          "group-hover/search:opacity-40",
          focused && "opacity-70 animate-[spin_4s_linear_infinite]",
        )}
      />

      <div
        className={cn(
          "relative flex items-center rounded-full border border-border bg-surface transition-all duration-300",
          "group-hover/search:border-primary/40",
          focused && "border-primary/70 shadow-card",
        )}
      >
        <Search
          className={cn(
            "pointer-events-none absolute left-3.5 size-4 text-muted-foreground transition-all duration-300",
            focused && "scale-110 -rotate-12 text-primary",
          )}
          aria-hidden="true"
        />

        <input
          id="site-search"
          ref={inputRef}
          type="search"
          value={value}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? (animateHints ? "" : "Search products, stores or categories")}
          className="h-10 w-full rounded-full bg-transparent pl-10 pr-24 text-sm outline-none placeholder:text-muted-foreground"
        />

        {animateHints && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-10 flex items-center gap-1 text-sm text-muted-foreground"
          >
            <span className="hidden sm:inline">Search for</span>
            <span className="font-semibold text-primary">{typed}</span>
            <span className="inline-block h-4 w-px animate-pulse bg-primary" />
          </span>
        )}

        <button
          type="submit"
          className={cn(
            "absolute right-1.5 inline-flex h-8 items-center gap-1 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground",
            "transition-all duration-300 hover:bg-primary/90 hover:gap-1.5 active:scale-95",
          )}
        >
          <Sparkles
            className={cn("size-3.5 transition-transform duration-500", focused && "rotate-180 scale-110")}
            aria-hidden="true"
          />
          Search
        </button>
      </div>
    </form>
  );
}
