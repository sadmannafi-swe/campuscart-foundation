import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}

export function SearchBar({
  placeholder = "Search products, stores or categories",
  defaultValue = "",
  className,
  autoFocus,
  onSubmitted,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate({ to: "/products", search: { q: value || undefined, category: undefined, sort: undefined } });
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative w-full", className)}>
      <label htmlFor="site-search" className="sr-only">
        Search CampusCart
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="site-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-24 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Search
      </button>
    </form>
  );
}
