import { ref } from "vue";
import { supabase } from "../utils/supabase";
import { useAuth } from "./useAuth";
import { useNotifications } from "./useNotifications";
import { idempotentInsert, generateClientRequestId } from "../utils/idempotency";
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
      clientRequestId: row.client_request_id || row.clientRequestId || undefined,
      client_request_id: row.client_request_id || row.clientRequestId || undefined,
      createdAt: row.created_at ? (typeof row.created_at === "number" ? row.created_at : new Date(row.created_at).getTime()) : Date.now(),
      updatedAt: row.updated_at ? (typeof row.updated_at === "number" ? row.updated_at : new Date(row.updated_at).getTime()) : Date.now(),
      parentCommentId: row.parent_comment_id || row.parentCommentId || null,
      rootCommentId: row.root_comment_id || row.rootCommentId || null,
      status: "sent"
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
      const mapped = (data || []).map(mapCommentRow);

      // Reconcile with local map to prevent duplicate items
      const commentMap = new Map<string, PostComment>();
      mapped.forEach((c) => {
        commentMap.set(c.id, c);
      });
      comments.value = Array.from(commentMap.values()).sort((a, b) => a.createdAt - b.createdAt);
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
          (payload: any) => {
            if (payload.eventType === "INSERT" && payload.new) {
              const newComment = mapCommentRow(payload.new);
              const reqId = newComment.clientRequestId;
              // Check if already in list by id or clientRequestId
              const exists = comments.value.some(
                (c) => c.id === newComment.id || (reqId && c.clientRequestId === reqId)
              );
              if (!exists) {
                comments.value.push(newComment);
                comments.value.sort((a, b) => a.createdAt - b.createdAt);
              }
            } else {
              fetchCommentsForPost(postId);
            }
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
      clientRequestId?: string;
    }
  ): Promise<string> => {
    if (!currentProfile.value) {
      throw new Error("You must complete your profile to comment.");
    }
    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new Error("Comment cannot be empty.");
    }

    const clientReqId = replyOptions?.clientRequestId || generateClientRequestId();
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const newCommentRecord = {
      id: commentId,
      post_id: postId,
      author_id: currentProfile.value.id,
      author_name: currentProfile.value.name,
      author_username: currentProfile.value.username,
      content: cleanContent,
      client_request_id: clientReqId,
      created_at: now
    };

    const insertResult = await idempotentInsert('comments', newCommentRecord, {
      userColumn: 'author_id',
      userId: currentProfile.value.id,
      clientRequestId: clientReqId
    });

    const savedComment = insertResult.data || newCommentRecord;
    const finalCommentId = savedComment.id || commentId;

    // Only notify if this was the FIRST actual insert (not a duplicate retry)
    if (!insertResult.isDuplicate) {
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
              commentId: finalCommentId,
              replyText: cleanContent
            }).catch(() => {});
          }

          if (postData.author_id && postData.author_id !== replyOptions?.parentAuthorId && postData.author_id !== currentProfile.value.id) {
            createCommentNotification({
              postAuthorId: postData.author_id,
              postId,
              postTitle: postData.title,
              commentId: finalCommentId,
              commentText: cleanContent
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn("Could not notify author:", e);
      }
    }

    await fetchCommentsForPost(postId);
    return finalCommentId;
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
