import { ref } from "vue";
import { supabase } from "../utils/supabase";
import { useAuth } from "./useAuth";
import { useImageUpload } from "./useImageUpload";
import type {
  Post,
  PostCategory,
  PostFilter,
  PostFormData,
  PostStatus,
  PostType,
  AdvancedFilterOptions
} from "../types/post";
import { getCategoryConfig, normalizeCategoryKey } from "../config/categories";
import { resolveCustomSubcategory, type ResolvedCustomSubcategory } from "./useCategories";
import { idempotentInsert, generateClientRequestId } from "../utils/idempotency";

const posts = ref<Post[]>([]);
const postsLoading = ref(false);
const postsRefreshing = ref(false);
const postsError = ref("");
const myHelpfulMap = ref<Record<string, boolean>>({});

let inFlightPostsPromise: Promise<Post[]> | null = null;
let realtimeChannelSubscribed = false;

const mapPostRow = (row: any): Post => {
  return {
    id: row.id,
    authorId: row.author_id || row.authorId || "anonymous",
    authorName: row.author_name || row.authorName || "Community Member",
    authorUsername: row.author_username || row.authorUsername || "member",
    authorAvatar: row.author_avatar || row.authorAvatar || undefined,
    type: (row.type?.toLowerCase() === "found" ? "found" : "lost") as PostType,
    title: row.title || row.itemName || "Untitled Item",
    category: (row.category || "Other") as PostCategory,
    subCategory: row.subcategory || row.subCategory || undefined,
    description: row.description || "",
    location: row.location || "Unknown location",
    eventDate: row.event_date || row.eventDate || row.date || (row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
    imageUrl: row.image_url || row.imageUrl || (Array.isArray(row.photos) && row.photos[0]) || undefined,
    imageKey: row.image_key || row.imageKey || undefined,
    imagePath: row.image_path || row.imagePath || undefined,
    photos: Array.isArray(row.photos) ? row.photos : (row.image_url ? [row.image_url] : []),
    status: (row.status?.toLowerCase() === "resolved"
      ? "resolved"
      : row.status?.toLowerCase() === "returned" || row.status?.toLowerCase() === "claimed"
      ? "returned"
      : "open") as PostStatus,
    helpfulCount: typeof row.helpful_count === "number" ? row.helpful_count : (typeof row.helpfulCount === "number" ? row.helpfulCount : 0),
    commentsCount: typeof row.comments_count === "number" ? row.comments_count : (typeof row.commentsCount === "number" ? row.commentsCount : 0),
    resolvedAt: row.resolved_at ? (typeof row.resolved_at === "number" ? row.resolved_at : new Date(row.resolved_at).getTime()) : undefined,
    resolvedBy: row.resolved_by || row.resolvedBy || undefined,
    meritRecipientId: row.merit_recipient_id || row.meritRecipientId || null,
    clientRequestId: row.client_request_id || row.clientRequestId || undefined,
    client_request_id: row.client_request_id || row.clientRequestId || undefined,
    createdAt: row.created_at ? (typeof row.created_at === "number" ? row.created_at : new Date(row.created_at).getTime()) : Date.now(),
    updatedAt: row.updated_at ? (typeof row.updated_at === "number" ? row.updated_at : new Date(row.updated_at).getTime()) : Date.now()
  };
};

const resolvePendingSubcategory = async (
  data: Partial<PostFormData>,
  category: string,
  subCategory?: string
): Promise<ResolvedCustomSubcategory | null> => {
  const pending = data.pendingSubcategory;
  if (!pending || !subCategory) return null;
  const categoryKey = getCategoryConfig(category)?.key;
  if (!categoryKey || getCategoryConfig(pending.category)?.key !== categoryKey ||
    normalizeCategoryKey(pending.name) !== normalizeCategoryKey(subCategory)) return null;
  return resolveCustomSubcategory(category, subCategory);
};

export function usePosts() {
  const { currentProfile, currentUser } = useAuth();
  const { uploadPostImage, deleteUploadedFile } = useImageUpload();

  const fetchPosts = async (options: { limit?: number; isRefresh?: boolean } = {}): Promise<Post[]> => {
    const limitCount = options.limit || 50;
    const isRefresh = Boolean(options.isRefresh);

    if (inFlightPostsPromise) {
      return inFlightPostsPromise;
    }

    if (posts.value.length === 0 && !isRefresh) {
      postsLoading.value = true;
    } else {
      postsRefreshing.value = true;
    }

    const startTime = performance.now();

    inFlightPostsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limitCount);

        if (error) throw error;

        const loaded: Post[] = (data || []).map(mapPostRow);
        posts.value = loaded;
        postsError.value = "";

        if (import.meta.env.DEV) {
          const elapsed = (performance.now() - startTime).toFixed(1);
          console.log(`[Perf] Home posts: ${elapsed} ms (${loaded.length} posts)`);
        }

        return loaded;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Posts fetch error:", error);
        }
        postsError.value = "Failed to load community posts.";
        return posts.value;
      } finally {
        postsLoading.value = false;
        postsRefreshing.value = false;
        inFlightPostsPromise = null;
      }
    })();

    if (currentUser.value?.uid) {
      loadMyHelpful(currentUser.value.uid);
    }

    return inFlightPostsPromise;
  };

  const subscribeToPosts = (options?: { limit?: number }) => {
    fetchPosts(options);

    if (!realtimeChannelSubscribed) {
      realtimeChannelSubscribed = true;
      try {
        supabase
          .channel("public:posts")
          .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
            fetchPosts({ isRefresh: true });
          })
          .subscribe();
      } catch (err) {
        console.warn("[usePosts] Realtime channel setup note:", err);
      }
    }
  };

  const loadMyHelpful = (uid: string) => {
    try {
      const raw = localStorage.getItem(`user_helpful_${uid}`);
      if (raw) {
        myHelpfulMap.value = JSON.parse(raw);
      }
    } catch {}
  };

  const saveMyHelpful = (uid: string) => {
    try {
      localStorage.setItem(`user_helpful_${uid}`, JSON.stringify(myHelpfulMap.value));
    } catch {}
  };

  const createPost = async (data: PostFormData): Promise<string> => {
    if (!currentProfile.value) {
      throw new Error("You must complete your profile first.");
    }

    const clientReqId = data.clientRequestId || generateClientRequestId();

    let finalImageUrl: string | null = null;
    let finalImageKey: string | null = null;

    if (data.imageFile) {
      const uploadRes = await uploadPostImage(data.imageFile);
      finalImageUrl = uploadRes.url;
      finalImageKey = uploadRes.key;
      // Cache uploaded image info on the form data object so retries won't re-upload
      data.imageUrl = finalImageUrl;
      data.imageKey = finalImageKey;
      data.imageFile = null;
    } else if (data.imageUrl && !data.imageUrl.startsWith("blob:")) {
      finalImageUrl = data.imageUrl.trim();
      finalImageKey = data.imageKey || null;
    }

    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    let subCat = data.subCategory?.trim() || null;
    const pending = await resolvePendingSubcategory(data, data.category, data.subCategory);
    if (pending) {
      subCat = pending.name;
      if (pending.isNew) {
        try {
          await supabase.from("subcategories").upsert({
            id: `${pending.categoryKey}_${pending.normalizedKey}`,
            category_key: pending.categoryKey,
            normalized_key: pending.normalizedKey,
            name: pending.name
          });
        } catch (e) {
          console.warn("Subcategory save note:", e);
        }
      }
    }

    const newPostRecord = {
      id: postId,
      author_id: currentProfile.value.id,
      author_name: currentProfile.value.name,
      author_username: currentProfile.value.username,
      author_avatar: currentProfile.value.avatarUrl || null,
      type: data.type,
      title: data.title.trim(),
      category: data.category,
      subcategory: subCat,
      description: data.description.trim(),
      location: data.location.trim(),
      photos: finalImageUrl ? [finalImageUrl] : [],
      status: "open",
      client_request_id: clientReqId,
      created_at: now,
      updated_at: now
    };

    const insertResult = await idempotentInsert('posts', newPostRecord, {
      userColumn: 'author_id',
      userId: currentProfile.value.id,
      clientRequestId: clientReqId
    });

    // Refresh local state
    await fetchPosts({ isRefresh: true });
    return insertResult.data?.id || postId;
  };

  const updatePost = async (postId: string, data: Partial<PostFormData>) => {
    if (!currentProfile.value) {
      throw new Error("You must be logged in to edit posts.");
    }

    const post = posts.value.find((p) => p.id === postId) || await getPostById(postId);
    if (!post) throw new Error("Post not found.");
    if (post.authorId !== currentProfile.value.id) {
      throw new Error("You can only edit your own posts.");
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (data.title !== undefined) updates.title = data.title.trim();
    if (data.category !== undefined) updates.category = data.category;
    if (data.subCategory !== undefined) updates.subcategory = data.subCategory?.trim() || null;
    if (data.description !== undefined) updates.description = data.description.trim();
    if (data.location !== undefined) updates.location = data.location.trim();

    if (data.removeImage) {
      updates.photos = [];
    } else if (data.imageUrl !== undefined && !data.imageUrl?.startsWith("blob:")) {
      updates.photos = data.imageUrl?.trim() ? [data.imageUrl.trim()] : [];
    }

    const pending = await resolvePendingSubcategory(
      data,
      data.category ?? post.category,
      data.subCategory === undefined ? post.subCategory : data.subCategory
    );
    if (pending) {
      updates.subcategory = pending.name;
      if (pending.isNew) {
        try {
          await supabase.from("subcategories").upsert({
            id: `${pending.categoryKey}_${pending.normalizedKey}`,
            category_key: pending.categoryKey,
            normalized_key: pending.normalizedKey,
            name: pending.name
          });
        } catch {}
      }
    }

    const { error } = await supabase.from("posts").update(updates).eq("id", postId);
    if (error) throw error;

    await fetchPosts({ isRefresh: true });
  };

  const resolvePost = async (postId: string, status: PostStatus = "resolved") => {
    if (!currentProfile.value) {
      throw new Error("You must be logged in.");
    }
    const post = posts.value.find((p) => p.id === postId);
    if (!post) throw new Error("Post not found.");
    if (post.authorId !== currentProfile.value.id) {
      throw new Error("You can only resolve your own posts.");
    }

    const { error } = await supabase
      .from("posts")
      .update({
        status,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", postId);

    if (error) throw error;
    await fetchPosts({ isRefresh: true });
  };

  const deletePost = async (postId: string) => {
    if (!currentProfile.value) {
      throw new Error("You must be logged in.");
    }
    const post = posts.value.find((p) => p.id === postId) || await getPostById(postId);
    if (!post) throw new Error("Post not found.");
    if (post.authorId !== currentProfile.value.id) {
      throw new Error("You can only delete your own posts.");
    }

    if (post.imageKey) {
      deleteUploadedFile(post.imageKey).catch(() => {});
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;

    try {
      await supabase.from("comments").delete().eq("post_id", postId);
    } catch {}

    posts.value = posts.value.filter((p) => p.id !== postId);
  };

  const toggleHelpful = async (postId: string) => {
    if (!currentUser.value) return;
    const uid = currentUser.value.uid;
    const post = posts.value.find((p) => p.id === postId);
    if (!post) return;

    const isMarked = !!myHelpfulMap.value[postId];
    const currentCount = post.helpfulCount || 0;
    const newCount = isMarked ? Math.max(0, currentCount - 1) : currentCount + 1;

    myHelpfulMap.value = {
      ...myHelpfulMap.value,
      [postId]: !isMarked
    };
    post.helpfulCount = newCount;
    saveMyHelpful(uid);

    try {
      await supabase.from("posts").update({ helpful_count: newCount }).eq("id", postId);
    } catch (err) {
      console.error("Error toggling helpful:", err);
    }
  };

  const isHelpfulByMe = (postId: string) => {
    return !!myHelpfulMap.value[postId];
  };

  const getPostById = async (postId: string): Promise<Post | null> => {
    const existing = posts.value.find((p) => p.id === postId);
    if (existing) return existing;

    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data) return mapPostRow(data);
      return null;
    } catch (e) {
      console.error("Failed to get post by id:", e);
      return null;
    }
  };

  const getFilteredPosts = (
    filter: PostFilter,
    search: string,
    advanced?: AdvancedFilterOptions
  ) => {
    const q = search.trim().toLowerCase();
    const categoryKey = (value: string) => getCategoryConfig(value)?.key || normalizeCategoryKey(value);
    const categoryKeys = new Set(advanced?.categories?.map(categoryKey));
    const subcategoryKeys = new Set(advanced?.subcategories?.map(normalizeCategoryKey));
    return posts.value.filter((post) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Lost" && post.type === "lost") ||
        (filter === "Found" && post.type === "found") ||
        (filter === "Resolved" && (post.status === "resolved" || post.status === "returned"));

      const matchesSearch =
        !q ||
        [
          post.title,
          post.description,
          post.location,
          post.category,
          post.subCategory,
          post.authorName,
          post.authorUsername
        ].some((text) => (text || "").toLowerCase().includes(q));

      const matchesCategories = categoryKeys.size === 0 || categoryKeys.has(categoryKey(post.category));
      const matchesSubcategories = subcategoryKeys.size === 0 ||
        Boolean(post.subCategory && subcategoryKeys.has(normalizeCategoryKey(post.subCategory)));

      return matchesFilter && matchesSearch && matchesCategories && matchesSubcategories;
    });
  };

  return {
    posts,
    postsLoading,
    postsRefreshing,
    postsError,
    fetchPosts,
    subscribeToPosts,
    createPost,
    updatePost,
    resolvePost,
    deletePost,
    toggleHelpful,
    isHelpfulByMe,
    getPostById,
    getFilteredPosts
  };
}
