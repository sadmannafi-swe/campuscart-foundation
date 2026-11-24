import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminModuleRow,
  AdminReport,
  BashaListing,
  BloodRequest,
  DonorProfile,
  PreOwnedListing,
  ReportTarget,
  ScopedSearchResult,
} from "@shared/types";
import { api, apiPost } from "@/lib/api";
import { useMarketplace } from "@/lib/marketplace";

/** Query string from a filter object, skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") out.set(k, String(v));
  const s = out.toString();
  return s ? `?${s}` : "";
}

// ---- Pre-Owned -------------------------------------------------------------

export interface PreOwnedFilters {
  q?: string | undefined;
  category?: string | undefined;
  condition?: string | undefined;
  location?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  status?: string | undefined;
  sort?: string | undefined;
}

export function usePreOwnedListings(filters: PreOwnedFilters) {
  const university = useMarketplace();
  return useQuery({
    queryKey: ["preowned", university, filters],
    queryFn: () => api<PreOwnedListing[]>(`/preowned${qs({ university, ...filters })}`),
  });
}

export function usePreOwnedListing(id: string) {
  return useQuery({
    queryKey: ["preowned-item", id],
    queryFn: () => api<PreOwnedListing>(`/preowned/${id}`),
    retry: false,
  });
}

export function useMyPreOwned(enabled: boolean) {
  return useQuery({
    queryKey: ["preowned-mine"],
    enabled,
    queryFn: () => api<PreOwnedListing[]>("/preowned/mine"),
  });
}

// ---- Blood Donation -----------------------------------------------------------

export function useBloodRequests(filters: Record<string, string | undefined>) {
  const university = useMarketplace();
  return useQuery({
    queryKey: ["blood-requests", university, filters],
    queryFn: () => api<BloodRequest[]>(`/blood/requests${qs({ university, ...filters })}`),
  });
}

export function useBloodRequest(id: string) {
  return useQuery({
    queryKey: ["blood-request", id],
    queryFn: () => api<BloodRequest>(`/blood/requests/${id}`),
    retry: false,
  });
}

export function useMyBloodRequests(enabled: boolean) {
  return useQuery({
    queryKey: ["blood-requests-mine"],
    enabled,
    queryFn: () => api<BloodRequest[]>("/blood/requests/mine"),
  });
}

export function useDonors(filters: Record<string, string | undefined>) {
  const university = useMarketplace();
  return useQuery({
    queryKey: ["donors", university, filters],
    queryFn: () => api<DonorProfile[]>(`/blood/donors${qs({ university, ...filters })}`),
  });
}

export function useDonor(id: string) {
  return useQuery({
    queryKey: ["donor", id],
    queryFn: () => api<DonorProfile>(`/blood/donors/${id}`),
    retry: false,
  });
}

export function useMyDonorProfile(enabled: boolean) {
  return useQuery({
    queryKey: ["donor-mine"],
    enabled,
    queryFn: () => api<DonorProfile | null>("/blood/donors/me"),
  });
}

// ---- BashaLagbe ---------------------------------------------------------------

export function useBashaListings(filters: Record<string, string | undefined>) {
  const university = useMarketplace();
  const uni = filters["university"] || university;
  return useQuery({
    queryKey: ["basha", uni, filters],
    queryFn: () => api<BashaListing[]>(`/basha${qs({ ...filters, university: uni })}`),
  });
}

export function useBashaListing(id: string) {
  return useQuery({
    queryKey: ["basha-item", id],
    queryFn: () => api<BashaListing>(`/basha/${id}`),
    retry: false,
  });
}

export function useMyBasha(enabled: boolean) {
  return useQuery({
    queryKey: ["basha-mine"],
    enabled,
    queryFn: () => api<BashaListing[]>("/basha/mine"),
  });
}

// ---- Search, chat, reports, admin -------------------------------------------------

export type SearchScope = "marketplace" | "preowned" | "all";

export function useScopedSearch(q: string, scope: SearchScope, enabled: boolean) {
  const university = useMarketplace();
  return useQuery({
    queryKey: ["search", university, scope, q],
    enabled,
    queryFn: () => api<ScopedSearchResult>(`/search${qs({ university, scope, q })}`),
  });
}

/** Opens (or reuses) the conversation about a listing/request/donor and returns its id. */
export async function openContextChat(kind: ReportTarget, id: string): Promise<string> {
  const { id: conversationId } = await apiPost<{ id: string }>("/chat/open-context", { kind, id });
  return conversationId;
}

export async function reportContent(
  target_type: ReportTarget,
  target_id: string,
  reason: string,
  details: string,
) {
  await apiPost("/reports", { target_type, target_id, reason, details });
}

export function useAdminModule(kind: ReportTarget, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-module", kind],
    enabled,
    queryFn: () => api<AdminModuleRow[]>(`/admin/modules/${kind}`),
  });
}

export function useAdminReports(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-reports"],
    enabled,
    queryFn: () => api<AdminReport[]>("/admin/reports"),
  });
}

/** Refreshes every module query after a change. */
export function useRefreshModules() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [
        "preowned",
        "preowned-item",
        "preowned-mine",
        "blood-requests",
        "blood-request",
        "blood-requests-mine",
        "donors",
        "donor",
        "donor-mine",
        "basha",
        "basha-item",
        "basha-mine",
        "search",
        "admin-module",
        "admin-reports",
      ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
    );
}
