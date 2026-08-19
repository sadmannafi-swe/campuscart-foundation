import {
  Bed,
  BookOpen,
  Coffee,
  Dumbbell,
  Laptop,
  PenTool,
  Shirt,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  BookOpen,
  Laptop,
  PenTool,
  Shirt,
  Coffee,
  Bed,
  Dumbbell,
  Sparkles,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Tag;
  return <Icon className={cn("size-5", className)} aria-hidden="true" />;
}
