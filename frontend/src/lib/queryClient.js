import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client for SkyGuide AI.
 *
 * Defaults are tuned for astronomy data that changes slowly:
 *  - staleTime 10 min mirrors the Astro Engine's server-side weather cache,
 *    so reopening a popover within that window never hits the network.
 *  - retry once keeps a single transient network blip from surfacing an error.
 *  - no refetch-on-focus: night-time observing sessions tab around a lot and
 *    we never want a silent background refetch to flash a skeleton.
 */
export const TEN_MINUTES = 10 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: TEN_MINUTES,
      gcTime: TEN_MINUTES * 3,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
