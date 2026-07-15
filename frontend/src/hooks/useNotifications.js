import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service";
import { createNotificationSocket } from "../services/socket.service";
import { useAuth } from "../context/AuthContext";

const KEY = ["notifications"];

/**
 * The notification centre: a REST-backed list plus live arrivals.
 *
 * The query is the source of truth; the socket only nudges it. A pushed
 * notification is merged into the cache directly (so the badge moves the
 * instant it lands) and de-duped by id, because a refetch can race the push.
 * If the socket never connects, the list still works — it just isn't live.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchNotifications(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const socket = createNotificationSocket();

    socket.on("notification:new", (incoming) => {
      queryClient.setQueryData(KEY, (prev) => {
        if (!prev) return prev; // nothing loaded yet; the mount fetch will get it
        if (prev.notifications.some((n) => n.id === incoming.id)) return prev;
        return {
          ...prev,
          notifications: [incoming, ...prev.notifications],
          unread: (prev.unread ?? 0) + 1,
        };
      });
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  const settle = () => queryClient.invalidateQueries({ queryKey: KEY });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    // Optimistic: the badge should drop the moment you open the thing.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const prev = queryClient.getQueryData(KEY);
      queryClient.setQueryData(KEY, (old) =>
        old
          ? {
              ...old,
              notifications: old.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n,
              ),
              unread: Math.max(0, (old.unread ?? 0) - 1),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => queryClient.setQueryData(KEY, ctx?.prev),
    onSettled: settle,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const prev = queryClient.getQueryData(KEY);
      queryClient.setQueryData(KEY, (old) =>
        old
          ? {
              ...old,
              notifications: old.notifications.map((n) => ({ ...n, read: true })),
              unread: 0,
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(KEY, ctx?.prev),
    onSettled: settle,
  });

  return {
    notifications: query.data?.notifications ?? [],
    unread: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    markRead,
    markAllRead,
  };
}
