import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { EyeOff, Eye, Flag, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  REPORT_REASON_LABELS,
  type AdminModuleRow,
  type AdminReport,
  type ReportTarget,
} from "@shared/types";
import { StatusPill, formatDay } from "@/components/modules/ModuleKit";
import { Button } from "@/components/ui/button";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { useAdminModule, useAdminReports, useRefreshModules } from "@/lib/modules";
import { cn } from "@/lib/utils";

const sections = [
  { id: "preowned", label: "Pre-Owned Listings" },
  { id: "blood_request", label: "Blood Requests" },
  { id: "donor", label: "Donor Profiles" },
  { id: "basha", label: "BashaLagbe Listings" },
  { id: "reports", label: "User Reports" },
] as const;
type Section = (typeof sections)[number]["id"];

function TargetLink({
  kind,
  id,
  children,
}: {
  kind: ReportTarget;
  id: string;
  children: React.ReactNode;
}) {
  const cls = "text-xs font-medium underline underline-offset-4 hover:text-primary";
  switch (kind) {
    case "preowned":
      return (
        <Link to="/preowned/$listingId" params={{ listingId: id }} className={cls}>
          {children}
        </Link>
      );
    case "blood_request":
      return (
        <Link to="/blood/requests/$requestId" params={{ requestId: id }} className={cls}>
          {children}
        </Link>
      );
    case "donor":
      return (
        <Link to="/blood/donors/$donorId" params={{ donorId: id }} className={cls}>
          {children}
        </Link>
      );
    case "basha":
      return (
        <Link to="/basha/$listingId" params={{ listingId: id }} className={cls}>
          {children}
        </Link>
      );
  }
}

/**
 * Moderation for Pre-Owned, Blood Donation and BashaLagbe, kept apart from store and
 * product management. Admins hide (unpublish) or delete posts and review reports.
 */
export function CampusModeration() {
  const [section, setSection] = useState<Section>("preowned");
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-xl font-semibold">Campus modules</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pre-Owned, Blood Donation and BashaLagbe posts and the reports users send about them.
      </p>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              section === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {section === "reports" ? <ReportsList /> : <ModuleList key={section} kind={section} />}
      </div>
    </section>
  );
}

function useAct() {
  const refresh = useRefreshModules();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      toast.success(done);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };
  return { busy, act };
}

function ModuleList({ kind }: { kind: ReportTarget }) {
  const { data = [], isLoading } = useAdminModule(kind, true);
  const { busy, act } = useAct();
  const [filter, setFilter] = useState<"all" | "reported" | "hidden">("all");
  const rows = data.filter((r) =>
    filter === "reported"
      ? r.open_reports > 0
      : filter === "hidden"
        ? r.moderation === "hidden"
        : true,
  );

  if (isLoading)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  return (
    <>
      <div className="mb-3 flex gap-2 text-xs">
        {(["all", "reported", "hidden"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-1",
              filter === f ? "border-foreground/30 bg-muted" : "border-border",
            )}
          >
            {f === "all"
              ? `All (${data.length})`
              : f === "reported"
                ? `Reported (${data.filter((r) => r.open_reports > 0).length})`
                : `Hidden (${data.filter((r) => r.moderation === "hidden").length})`}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="card-surface p-8 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r: AdminModuleRow) => (
            <li key={r.id} className="card-surface flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.subtitle} · by {r.owner_name} · {r.university_slug.toUpperCase()} ·{" "}
                  {formatDay(r.created_at)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusPill status={r.status} />
                  {r.moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
                  {r.open_reports > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      <Flag className="size-3" /> {r.open_reports} open report
                      {r.open_reports > 1 ? "s" : ""}
                    </span>
                  )}
                  <TargetLink kind={kind} id={r.id}>
                    View
                  </TargetLink>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() =>
                    act(
                      r.id,
                      () =>
                        apiPost(`/admin/modules/${kind}/${r.id}/moderation`, {
                          moderation: r.moderation === "hidden" ? "visible" : "hidden",
                        }),
                      r.moderation === "hidden" ? "Published again" : "Hidden from the public",
                    )
                  }
                >
                  {r.moderation === "hidden" ? (
                    <>
                      <Eye /> Restore
                    </>
                  ) : (
                    <>
                      <EyeOff /> Hide
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={busy === r.id}
                  onClick={() =>
                    window.confirm("Delete this permanently?") &&
                    void act(r.id, () => apiDelete(`/admin/modules/${kind}/${r.id}`), "Deleted")
                  }
                >
                  <Trash2 /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ReportsList() {
  const { data = [], isLoading } = useAdminReports(true);
  const { busy, act } = useAct();
  const [status, setStatus] = useState<"open" | "reviewed" | "dismissed">("open");
  const rows = data.filter((r) => r.status === status);
  if (isLoading)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  return (
    <>
      <div className="mb-3 flex gap-2 text-xs">
        {(["open", "reviewed", "dismissed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-1 capitalize",
              status === s ? "border-foreground/30 bg-muted" : "border-border",
            )}
          >
            {s} ({data.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="card-surface p-8 text-center text-sm text-muted-foreground">
          No {status} reports.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r: AdminReport) => (
            <li key={r.id} className="card-surface p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{REPORT_REASON_LABELS[r.reason]}</p>
                  <p className="text-xs text-muted-foreground">
                    {sections.find((s) => s.id === r.target_type)?.label} ·{" "}
                    {r.target_title ?? "Deleted"} · reported by {r.reporter_name} ·{" "}
                    {formatDay(r.created_at)}
                  </p>
                  {r.details && <p className="mt-1.5 text-sm">“{r.details}”</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    {r.target_moderation === "hidden" && <StatusPill status="hidden" tone="bad" />}
                    {r.target_title && (
                      <TargetLink kind={r.target_type} id={r.target_id}>
                        View post
                      </TargetLink>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.target_title && r.target_moderation === "visible" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() =>
                        act(
                          r.id,
                          async () => {
                            await apiPost(
                              `/admin/modules/${r.target_type}/${r.target_id}/moderation`,
                              { moderation: "hidden" },
                            );
                            await apiPatch(`/admin/reports/${r.id}`, { status: "reviewed" });
                          },
                          "Post hidden and report closed",
                        )
                      }
                    >
                      <EyeOff /> Hide post
                    </Button>
                  )}
                  {r.status !== "reviewed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() =>
                        act(
                          r.id,
                          () => apiPatch(`/admin/reports/${r.id}`, { status: "reviewed" }),
                          "Marked reviewed",
                        )
                      }
                    >
                      Reviewed
                    </Button>
                  )}
                  {r.status !== "dismissed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() =>
                        act(
                          r.id,
                          () => apiPatch(`/admin/reports/${r.id}`, { status: "dismissed" }),
                          "Dismissed",
                        )
                      }
                    >
                      Dismiss
                    </Button>
                  )}
                  {r.status !== "open" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() =>
                        act(
                          r.id,
                          () => apiPatch(`/admin/reports/${r.id}`, { status: "open" }),
                          "Reopened",
                        )
                      }
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
