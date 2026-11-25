import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MarketplaceEvent, PublicEvent, UploadSignature } from "@shared/types";
import { api, apiDelete, apiPatch, apiPost } from "@/lib/api";
import { liveProductFromApi } from "@/lib/liveCatalog";
import type { Product } from "@/lib/types";

export type HomeEvent = Omit<PublicEvent, "products"> & { products: Product[] };

const toHomeEvent = (e: PublicEvent | null): HomeEvent | null =>
  e ? { ...e, products: e.products.map((p) => liveProductFromApi(p)) } : null;

/** The marketplace's active event (banner + its admin-selected products), or null. */
export function useActiveEvent(university: string) {
  return useQuery({
    queryKey: ["event-active", university],
    queryFn: async () =>
      toHomeEvent(await api<PublicEvent | null>(`/events/active?university=${university}`)),
    staleTime: 30_000,
  });
}

/** An event page. Resolves to null when the event isn't active (ended or removed). */
export function useEvent(id: string, university: string) {
  return useQuery({
    queryKey: ["event", id, university],
    queryFn: () =>
      api<PublicEvent>(`/events/${id}?university=${university}`)
        .then(toHomeEvent)
        .catch(() => null),
  });
}

// ---- admin ----------------------------------------------------------------------

export type EventInput = {
  university_slug: string;
  title: string;
  description: string;
  banner_url: string;
  product_ids: string[];
  is_active: boolean;
};

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: () => api<MarketplaceEvent[]>("/admin/events"),
  });
}

export function useEventMutations() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    void queryClient.invalidateQueries({ queryKey: ["event-active"] });
  };
  return {
    create: useMutation({
      mutationFn: (body: EventInput) => apiPost<MarketplaceEvent>("/admin/events", body),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: Partial<EventInput> & { id: string }) =>
        apiPatch<MarketplaceEvent>(`/admin/events/${id}`, body),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiDelete(`/admin/events/${id}`),
      onSuccess: refresh,
    }),
  };
}

/** Upload an event banner to the admin's own Cloudinary folder. Returns its URL. */
export async function uploadEventBanner(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be smaller than 8 MB.");
  const sig = await apiPost<UploadSignature>("/admin/uploads/sign-event");
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? "Image upload failed.");
  return data.secure_url;
}
