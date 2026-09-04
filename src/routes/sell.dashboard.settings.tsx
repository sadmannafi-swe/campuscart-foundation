import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { SellerShell } from "@/components/seller/SellerShell";
import { supabase } from "@/integrations/supabase/client";
import { useSellerAccount, useUniversities } from "@/lib/seller";

export const Route = createFileRoute("/sell/dashboard/settings")({
  component: SellerSettings,
});

function SellerSettings() {
  const { seller } = useSellerAccount();
  const { data: universities = [] } = useUniversities();
  const [showId, setShowId] = useState(false);

  const { data: studentId } = useQuery({
    queryKey: ["seller-student-id", seller?.id],
    enabled: !!seller,
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_identity")
        .select("student_id")
        .eq("seller_id", seller!.id)
        .maybeSingle();
      return data?.student_id ?? null;
    },
  });

  const uni = universities.find((u) => u.slug === seller?.university_slug);
  const masked = studentId ? `${studentId.slice(0, 2)}${"•".repeat(Math.max(studentId.length - 2, 3))}` : "—";

  return (
    <SellerShell title="Settings">
      <div className="card-surface divide-y divide-border">
        <Row label="Full Name" value={seller?.full_name ?? "—"} />
        <Row label="Email" value={seller?.email ?? "—"} />
        <Row label="Phone Number" value={seller?.phone ?? "—"} />
        <Row label="University" value={uni?.name ?? seller?.university_slug ?? "—"} />
        <Row label="Department" value={seller?.department ?? "—"} />
        <Row label="Batch" value={seller?.batch ?? "—"} />
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Student ID (private)</span>
          <span className="flex items-center gap-2 font-semibold">
            {showId ? (studentId ?? "—") : masked}
            <button
              type="button"
              onClick={() => setShowId((s) => !s)}
              aria-label={showId ? "Hide Student ID" : "Show Student ID"}
              className="text-muted-foreground"
            >
              {showId ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Your Student ID is never shown on your public store, products or reviews. Only you and
        CampusCart admin can see it.
      </p>
    </SellerShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
