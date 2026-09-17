import { ref } from "vue";
import { supabase } from "../utils/supabase";
import { useAuth } from "./useAuth";
import { useNotifications } from "./useNotifications";
import type { PostComment } from "../types/comment";

export function useComments() {
  const { currentProfile } = useAuth();
  const comments = ref<PostComment[]>([]);
  const commentsLoading = ref(false);

  let realtimeChannel: any = null;

  const mapCommentRow = (row: any): PostComment => {
    return {
      id: row.id,
      postId: row.post_id || row.postId,
      authorId: row.author_id || row.authorId || "anonymous",
      authorName: row.author_name || row.authorName || "Community Member",
      authorUsername: row.author_username || row.authorUsername || "member",
      content: row.content || "",
      createdAt: row.created_at ? (typeof row.created_at === "number" ? row.created_at : new Date(row.created_at).getTime()) : Date.now(),
      updatedAt: row.updated_at ? (typeof row.updated_at === "number" ? row.updated_at : new Date(row.updated_at).getTime()) : Date.now(),
      parentCommentId: row.parent_comment_id || row.parentCommentId || null,
      rootCommentId: row.root_comment_id || row.rootCommentId || null
    };
  };

  const fetchCommentsForPost = async (postId: string) => {
    if (!postId) return;
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      comments.value = (data || []).map(mapCommentRow);
    } catch (err) {
      console.error("[useComments] Failed fetching comments:", err);
    } finally {
      commentsLoading.value = false;
    }
  };

  const subscribeToComments = (postId: string) => {
    commentsLoading.value = true;
    fetchCommentsForPost(postId);

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    try {
      realtimeChannel = supabase
        .channel(`public:comments:${postId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
            filter: `post_id=eq.${postId}`
          },
          () => {
            fetchCommentsForPost(postId);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[useComments] Realtime subscription note:", err);
    }
  };

  const addComment = async (
    postId: string,
    content: string,
    replyOptions?: {
      parentCommentId?: string | null;
      rootCommentId?: string | null;
      parentAuthorId?: string;
    }
  ): Promise<string> => {
    if (!currentProfile.value) {
      throw new Error("You must complete your profile to comment.");
    }
    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new Error("Comment cannot be empty.");
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const newCommentRecord = {
      id: commentId,
      post_id: postId,
      author_id: currentProfile.value.id,
      author_name: currentProfile.value.name,
      author_username: currentProfile.value.username,
      content: cleanContent,
      created_at: now
    };

    const { error } = await supabase.from("comments").insert(newCommentRecord);
    if (error) throw error;

    // Notify author
    try {
      const { data: postData } = await supabase
        .from("posts")
        .select("title, author_id")
        .eq("id", postId)
        .maybeSingle();

      if (postData) {
        const { createCommentNotification, createReplyNotification } = useNotifications();

        if (replyOptions?.parentAuthorId) {
          createReplyNotification({
            targetAuthorId: replyOptions.parentAuthorId,
            postId,
            postTitle: postData.title,
            commentId,
            replyText: cleanContent
          }).catch(() => {});
        }

        if (postData.author_id && postData.author_id !== replyOptions?.parentAuthorId && postData.author_id !== currentProfile.value.id) {
          createCommentNotification({
            postAuthorId: postData.author_id,
            postId,
            postTitle: postData.title,
            commentId,
            commentText: cleanContent
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Could not notify author:", e);
    }

    await fetchCommentsForPost(postId);
    return commentId;
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!currentProfile.value) {
      throw new Error("You must be logged in.");
    }

    const comment = comments.value.find((c) => c.id === commentId);
    if (!comment) throw new Error("Comment not found.");
    if (comment.authorId !== currentProfile.value.id) {
      throw new Error("You can only delete your own comments.");
    }

    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;

    comments.value = comments.value.filter((c) => c.id !== commentId);
  };

  const stopCommentsSubscription = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };

  return {
    comments,
    commentsLoading,
    subscribeToComments,
    stopCommentsSubscription,
    addComment,
    deleteComment
  };
}
