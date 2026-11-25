import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminPaymentsOverview,
  AdminPaymentSubmission,
  AdminPromotion,
  AdminStorePayments,
  MonthlySales,
  PaymentAuditEntry,
  PaymentConfig,
  PaymentDisplayStatus,
  PaymentMethod,
  PromotionStatus,
  SellerPaymentsOverview,
  SellerPaymentSubmission,
  SellerPromotion,
  SubmissionStatus,
} from "@shared/types";
import { api, apiDelete, apiPost } from "@/lib/api";

// ---- Formatting (always Bangladesh time) ------------------------------------------------

const TZ = "Asia/Dhaka";

export const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};
export const dhakaDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
export const dhakaDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });
/** An exclusive end instant shown as the last day it covers ("10 Feb 2027"). */
export const lastDay = (iso: string) =>
  dhakaDate(new Date(new Date(iso).getTime() - 1).toISOString());
export const periodLabel = (startIso: string, endIso: string) =>
  `${dhakaDate(startIso)} – ${lastDay(endIso)}`;

export const methodLabel = (m: PaymentMethod) => (m === "bkash" ? "bKash" : "Nagad");

export const paymentStatusMeta: Record<PaymentDisplayStatus, { label: string; className: string }> =
  {
    not_due: { label: "Not Due", className: "bg-muted text-muted-foreground" },
    pending: { label: "Pending", className: "bg-warning/15 text-warning-foreground" },
    submitted: { label: "Payment Submitted", className: "bg-basha-soft text-basha" },
    paid: { label: "Paid", className: "bg-accent-soft text-accent" },
    overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
    waived: { label: "Waived", className: "bg-muted text-muted-foreground" },
  };

export const submissionStatusMeta: Record<SubmissionStatus, { label: string; className: string }> =
  {
    pending_verification: {
      label: "Waiting for verification",
      className: "bg-basha-soft text-basha",
    },
    confirmed: { label: "Paid", className: "bg-accent-soft text-accent" },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  };

export function promotionStatusMeta(p: SellerPromotion): { label: string; className: string } {
  if (p.status === "active") {
    if (p.live_state === "scheduled")
      return { label: "Scheduled", className: "bg-basha-soft text-basha" };
    if (p.live_state === "live") return { label: "Live", className: "bg-accent-soft text-accent" };
  }
  const map: Record<PromotionStatus, { label: string; className: string }> = {
    awaiting_payment: {
      label: "Awaiting payment",
      className: "bg-warning/15 text-warning-foreground",
    },
    payment_submitted: { label: "Payment Submitted", className: "bg-basha-soft text-basha" },
    payment_rejected: {
      label: "Payment rejected",
      className: "bg-destructive/10 text-destructive",
    },
    active: { label: "Ended", className: "bg-muted text-muted-foreground" },
    expired: { label: "Ended", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  };
  return map[p.status];
}

// ---- Seller -----------------------------------------------------------------------------

export function useSellerPayments(userId: string | undefined) {
  return useQuery({
    queryKey: ["seller-payments", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: () => api<SellerPaymentsOverview>("/seller/payments"),
  });
}

export type PaymentSubmitInput = {
  type: "platform_fee" | "promotion";
  invoice_id?: string;
  promotion_id?: string;
  method: PaymentMethod;
  sender_phone: string;
  trx_id: string;
  amount: number;
  confirmed: boolean;
};

export function useSellerPaymentActions() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["seller-payments"] });
    void qc.invalidateQueries({ queryKey: ["seller-account"] });
  };
  return {
    submit: useMutation({
      mutationFn: (body: PaymentSubmitInput) =>
        apiPost<SellerPaymentSubmission>("/seller/payments", body),
      onSuccess: refresh,
    }),
    createPromotion: useMutation({
      mutationFn: (body: { package_id: string; product_ids: string[] }) =>
        apiPost<SellerPromotion>("/seller/promotions", body),
      onSuccess: refresh,
    }),
    cancelPromotion: useMutation({
      mutationFn: (id: string) => apiDelete(`/seller/promotions/${id}`),
      onSuccess: refresh,
    }),
  };
}

// ---- Admin ------------------------------------------------------------------------------

export function useAdminPaymentsOverview() {
  return useQuery({
    queryKey: ["admin-payments", "overview"],
    refetchInterval: 30_000,
    queryFn: () => api<AdminPaymentsOverview>("/admin/payments/overview"),
  });
}

export function useAdminSubmissions(status: SubmissionStatus | "all") {
  return useQuery({
    queryKey: ["admin-payments", "submissions", status],
    refetchInterval: 30_000,
    queryFn: () =>
      api<AdminPaymentSubmission[]>(
        `/admin/payments/submissions${status === "all" ? "" : `?status=${status}`}`,
      ),
  });
}

export function useAdminPromotions() {
  return useQuery({
    queryKey: ["admin-payments", "promotions"],
    queryFn: () => api<AdminPromotion[]>("/admin/payments/promotions"),
  });
}

export function useAdminStorePayments(storeId: string | null) {
  return useQuery({
    queryKey: ["admin-payments", "store", storeId],
    enabled: !!storeId,
    queryFn: () => api<AdminStorePayments>(`/admin/payments/stores/${storeId}`),
  });
}

export function useAdminStoreMonth(storeId: string | null, month: string | null) {
  return useQuery({
    queryKey: ["admin-payments", "store-month", storeId, month],
    enabled: !!storeId && !!month,
    queryFn: () => api<MonthlySales>(`/admin/payments/stores/${storeId}/month?month=${month}`),
  });
}

export function useAdminAudit() {
  return useQuery({
    queryKey: ["admin-payments", "audit"],
    queryFn: () => api<PaymentAuditEntry[]>("/admin/payments/audit"),
  });
}

export function useAdminPaymentConfig() {
  return useQuery({
    queryKey: ["admin-payments", "config"],
    queryFn: () => api<PaymentConfig>("/admin/payments/config"),
  });
}

export function useAdminPaymentActions() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-payments"] });
  return {
    confirm: useMutation({
      mutationFn: (v: { id: string; verified_amount: number; note?: string | undefined }) =>
        apiPost(`/admin/payments/submissions/${v.id}/confirm`, {
          verified_amount: v.verified_amount,
          ...(v.note ? { note: v.note } : {}),
        }),
      onSuccess: refresh,
    }),
    reject: useMutation({
      mutationFn: (v: { id: string; reason: string; note?: string | undefined }) =>
        apiPost(`/admin/payments/submissions/${v.id}/reject`, {
          reason: v.reason,
          ...(v.note ? { note: v.note } : {}),
        }),
      onSuccess: refresh,
    }),
    note: useMutation({
      mutationFn: (v: { id: string; note: string }) =>
        apiPost(`/admin/payments/submissions/${v.id}/note`, { note: v.note }),
      onSuccess: refresh,
    }),
    invoiceStatus: useMutation({
      mutationFn: (v: {
        id: string;
        status: "paid" | "pending" | "waived";
        note: string;
        paid_amount?: number;
      }) =>
        apiPost(`/admin/payments/invoices/${v.id}/status`, {
          status: v.status,
          note: v.note,
          ...(v.paid_amount !== undefined ? { paid_amount: v.paid_amount } : {}),
        }),
      onSuccess: refresh,
    }),
    publication: useMutation({
      mutationFn: (v: { id: string; action: "suspend" | "republish"; note: string }) =>
        apiPost(`/admin/payments/stores/${v.id}/publication`, { action: v.action, note: v.note }),
      onSuccess: refresh,
    }),
    saveConfig: useMutation({
      mutationFn: (v: Omit<PaymentConfig, "updated_by" | "updated_at">) =>
        api("/admin/payments/config", { method: "PUT", body: v }),
      onSuccess: refresh,
    }),
    runBilling: useMutation({
      mutationFn: () =>
        apiPost<{ invoices: number; overdue: number; expired: number }>(
          "/admin/payments/run-billing",
        ),
      onSuccess: refresh,
    }),
  };
}
