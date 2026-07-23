import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deletePhoto,
  fetchGallery,
  fetchObserverGallery,
  toggleLike,
  uploadPhoto,
} from "../services/gallery.service";
import { useToast } from "../context/ToastContext";

const GALLERY_KEY = ["gallery"];

/**
 * The community gallery.
 *
 * Liking is optimistic: the count and the filled heart update instantly and roll
 * back if the request fails. A like is a one-tap action, so waiting for a
 * round-trip before the heart fills makes the whole page feel broken — and the
 * failure case is both rare and harmless to undo.
 *
 * The list is NOT re-sorted on like. Sorting is by like count, so honouring it
 * live would make a photo jump out from under the cursor the moment it's
 * tapped; the new order arrives on the next natural refetch instead.
 */
export function useGallery(sort = "top") {
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: [...GALLERY_KEY, sort],
    queryFn: () => fetchGallery(sort),
    staleTime: 60 * 1000,
  });

  const like = useMutation({
    mutationFn: (id) => toggleLike(id),

    onMutate: async (id) => {
      const key = [...GALLERY_KEY, sort];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old = []) =>
        old.map((post) =>
          post.id === id
            ? {
                ...post,
                likedByMe: !post.likedByMe,
                likeCount: post.likeCount + (post.likedByMe ? -1 : 1),
              }
            : post,
        ),
      );

      return { previous, key };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
      toast.error("Couldn't register that like. Please try again.");
    },

    // Refresh the featured strip too — its membership depends on like counts.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: GALLERY_KEY });
    },
  });

  const upload = useMutation({
    mutationFn: ({ file, caption }) => uploadPhoto(file, caption),
    onSuccess: () => {
      toast.success("Shared with the community.");
      queryClient.invalidateQueries({ queryKey: GALLERY_KEY });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          "Couldn't share that photo. Please try again.",
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id) => deletePhoto(id),
    onSuccess: () => {
      toast.success("Photo removed.");
      queryClient.invalidateQueries({ queryKey: GALLERY_KEY });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Couldn't remove that photo.");
    },
  });

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    like: like.mutate,
    upload: upload.mutateAsync,
    isUploading: upload.isPending,
    remove: remove.mutate,
  };
}

/** One observer's photos — used by the profile strip. */
export function useObserverGallery(username) {
  const query = useQuery({
    queryKey: [...GALLERY_KEY, "observer", username],
    queryFn: () => fetchObserverGallery(username),
    enabled: Boolean(username),
    staleTime: 60 * 1000,
  });

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
  };
}
