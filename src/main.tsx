import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  // Pages cross-fade where the browser supports the View Transitions API.
  defaultViewTransition: true,
});

// A navigation that starts while the previous page's cross-fade is still running (a
// redirect, a quick double tap) makes the browser skip that animation and reject its
// promise. Nothing is wrong — the new page still shows — so don't report it as an error.
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason as { name?: string; message?: string } | null;
  if (r?.name === "AbortError" && /Transition was skipped/.test(r.message ?? ""))
    e.preventDefault();
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
