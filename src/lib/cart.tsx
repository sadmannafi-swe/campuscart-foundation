import { useSyncExternalStore } from "react";
import type { Product } from "@/lib/types";
import { getStoreById } from "@/data/marketplace";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  /** storage path for live listings (re-signed when shown) */
  imagePath?: string | undefined;
  price: number;
  quantity: number;
  sellerId?: string | undefined;
  sellerName: string;
  storeId: string;
  storeName: string;
  universitySlug: string;
  /** real seller listing that can be ordered */
  live: boolean;
}

const KEY = "campuscart-cart-v1";
const MAX_QTY = 10;
let items: CartItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: CartItem[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    items = raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    items = [];
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    emit();
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function save(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / blocked: keep in memory */
  }
  emit();
}

export function productToCartItem(product: Product, quantity: number): CartItem {
  const store = getStoreById(product.storeId);
  const storeName = product.storeName ?? store?.name ?? "Campus store";
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    imagePath: product.imagePath,
    price: product.price,
    quantity: Math.max(1, Math.min(MAX_QTY, quantity)),
    sellerId: product.sellerId,
    sellerName: storeName,
    storeId: product.storeId,
    storeName,
    universitySlug: product.universitySlug ?? "diu",
    live: !!product.live,
  };
}

export const cart = {
  add(product: Product, quantity = 1) {
    load();
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      save(
        items.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity), price: product.price }
            : i,
        ),
      );
    } else {
      save([...items, productToCartItem(product, quantity)]);
    }
  },
  setQuantity(productId: string, quantity: number) {
    load();
    save(
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i,
      ),
    );
  },
  remove(productId: string) {
    load();
    save(items.filter((i) => i.productId !== productId));
  },
  removeMany(productIds: string[]) {
    load();
    save(items.filter((i) => !productIds.includes(i.productId)));
  },
};

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  // pick up storage contents loaded after first render
  queueMicrotask(listener);
  return () => listeners.delete(listener);
}

export function useCart() {
  const list = useSyncExternalStore(
    subscribe,
    () => (loaded ? items : EMPTY),
    () => EMPTY,
  );
  const count = list.reduce((n, i) => n + i.quantity, 0);
  const subtotal = list.reduce((n, i) => n + i.price * i.quantity, 0);
  return { items: list, count, subtotal };
}

/** Flat delivery charge per store order. Kept separate from product revenue. */
