import { ref, onMounted, watch } from "vue";
import { supabase } from "../utils/supabase";

export interface LatestCommentPreview {
  id: string;
  authorName: string;
  content: string;
  createdAt: number;
}

const latestCommentCache = new Map<string, LatestCommentPreview | null>();
const inFlightCommentRequests = new Map<string, Promise<LatestCommentPreview | null>>();

export async function fetchLatestCommentForPost(postId: string): Promise<LatestCommentPreview | null> {
  if (!postId) return null;
  if (latestCommentCache.has(postId)) {
    return latestCommentCache.get(postId) || null;
  }
  if (inFlightCommentRequests.has(postId)) {
    return inFlightCommentRequests.get(postId)!;
  }

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id, author_name, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        latestCommentCache.set(postId, null);
        return null;
      }

      if (!data || !data.content) {
        latestCommentCache.set(postId, null);
        return null;
      }

      const preview: LatestCommentPreview = {
        id: data.id,
        authorName: data.author_name || "Community Member",
        content: data.content,
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now()
      };
      latestCommentCache.set(postId, preview);
      return preview;
    } catch {
      latestCommentCache.set(postId, null);
      return null;
    } finally {
      inFlightCommentRequests.delete(postId);
    }
  })();

  inFlightCommentRequests.set(postId, fetchPromise);
  return fetchPromise;
}

export function invalidateLatestCommentCache(postId: string) {
  latestCommentCache.delete(postId);
}

export function useLatestComment(postIdGetter: () => string) {
  const latestComment = ref<LatestCommentPreview | null>(null);

  const load = async (postId: string) => {
    if (!postId) {
      latestComment.value = null;
      return;
    }
    const result = await fetchLatestCommentForPost(postId);
    latestComment.value = result;
  };

  onMounted(() => {
    load(postIdGetter());
  });

  watch(postIdGetter, (newId) => {
    load(newId);
  });

  return {
    latestComment
  };
}
