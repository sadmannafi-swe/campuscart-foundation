import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppNotification as AppNotificationT } from "@shared/types";
import { api, apiPost } from "@/lib/api";

export type AppNotification = AppNotificationT;

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchInterval: 15000,
    queryFn: () => api<AppNotification[]>("/notifications"),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      await apiPost("/notifications/read", { ids });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
