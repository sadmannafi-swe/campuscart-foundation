import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Store as StoreIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { categories, products, stores } from "@/data/marketplace";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}

const STORAGE_KEY = "campuscart:recent-searches";
const popularSearches = ["Notes", "Jersey", "Backpack", "Textbook", "Water bottle", "Headphones"];

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeRecents(list: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    /* ignore */
  }
}

interface Suggestion {
  label: string;
  kind: "product" | "store" | "category";
}

function buildSuggestions(query: string): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: Suggestion[] = [];
  for (const p of products) {
    if (p.name.toLowerCase().includes(q)) out.push({ label: p.name, kind: "product" });
    if (out.length >= 5) break;
  }
  for (const s of stores) {
    if (out.length >= 7) break;
    if (s.name.toLowerCase().includes(q)) out.push({ label: s.name, kind: "store" });
  }
  for (const c of categories) {
    if (out.length >= 8) break;
    if (c.name.toLowerCase().includes(q)) out.push({ label: c.name, kind: "category" });
  }
  return out;
}

export function SearchBar({
  placeholder,
  defaultValue = "",
  className,
  autoFocus,
  onSubmitted,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    setRecents(readRecents());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const suggestions = buildSuggestions(value);

  function runSearch(term: string) {
    const q = term.trim();
    if (q) {
      const next = [q, ...recents.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
      setRecents(next);
      writeRecents(next);
    }
    setOpen(false);
    navigate({ to: "/products", search: { q: q || undefined, category: undefined, sort: undefined } });
    onSubmitted?.();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    runSearch(value);
  }

  function removeRecent(term: string) {
    const next = recents.filter((r) => r !== term);
    setRecents(next);
    writeRecents(next);
  }

  const showDropdown = open && (value.trim() ? suggestions.length > 0 : true);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form role="search" onSubmit={handleSubmit} className="w-full">
        <label htmlFor="site-search" className="sr-only">
          Search CampusCart
        </label>

        <div
          className={cn(
            "relative flex items-center rounded-full border border-border bg-surface transition-colors",
            focused && "border-primary/60",
          )}
        >
          <Search
            className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />

          <input
            id={inputId}
            type="search"
            name="campuscart-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            value={value}
            autoFocus={autoFocus}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder ?? "Search products, stores or categories"}
            className="h-10 w-full rounded-full bg-transparent pl-10 pr-24 text-sm outline-none placeholder:text-muted-foreground"
          />

          <button
            type="submit"
            className="absolute right-1.5 inline-flex h-8 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-lg">
          {value.trim() ? (
            <ul className="space-y-0.5">
              {suggestions.map((s) => (
                <li key={`${s.kind}-${s.label}`}>
                  <button
                    type="button"
                    onClick={() => runSearch(s.label)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    {s.kind === "store" ? (
                      <StoreIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    {s.kind !== "product" && (
                      <span className="shrink-0 text-[11px] capitalize text-muted-foreground">{s.kind}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-1">
              {recents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Recent searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecents([]);
                        writeRecents([]);
                      }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {recents.map((term) => (
                      <li key={term} className="group/row flex items-center rounded-lg hover:bg-gray-50">
                        <button
                          type="button"
                          onClick={() => runSearch(term)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm"
                        >
                          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{term}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${term}`}
                          onClick={() => removeRecent(term)}
                          className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="px-2.5 pb-1 pt-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Popular right now
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => runSearch(term)}
                      className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
