import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchMyProfile,
  removeAvatar,
  updateMyProfile,
  uploadAvatar,
} from "../services/profile.service";
import { useAuth } from "../context/AuthContext";

const KEY = ["profile", "me"];

/**
 * The signed-in observer's own profile + mutations (edit, avatar set/clear).
 *
 * On any change it refreshes the profile query AND calls the auth context's
 * checkAuth() so the shared `user` (avatar in the navbar/header, display name)
 * stays in sync across the app without a reload.
 */
export function useProfile() {
  const queryClient = useQueryClient();
  const { checkAuth } = useAuth();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchMyProfile,
    staleTime: 60 * 1000,
  });

  const settle = (fresh) => {
    if (fresh) queryClient.setQueryData(KEY, fresh);
    queryClient.invalidateQueries({ queryKey: KEY });
    checkAuth?.(); // resync the global user (avatar, name)
  };

  const update = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: settle,
  });

  const setAvatar = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: settle,
  });

  const clearAvatar = useMutation({
    mutationFn: removeAvatar,
    onSuccess: settle,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    update,
    setAvatar,
    clearAvatar,
  };
}
