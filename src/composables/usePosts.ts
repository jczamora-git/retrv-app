import { ref } from "vue";
import { supabase } from "../utils/supabase";
import { useAuth } from "./useAuth";
import { useImageUpload } from "./useImageUpload";
import {
  POSTS_PAGE_SIZE,
  type Post,
  type PostCategory,
  type PostCursor,
  type PostFilter,
  type PostFormData,
  type PostStatus,
  type PostType,
  type FetchPostsOptions,
  type AdvancedFilterOptions
} from "../types/post";
import { getCategoryConfig, normalizeCategoryKey } from "../config/categories";
import { resolveCustomSubcategory, type ResolvedCustomSubcategory } from "./useCategories";
import { idempotentInsert, generateClientRequestId } from "../utils/idempotency";

const posts = ref<Post[]>([]);
const postsLoading = ref(false);
const postsRefreshing = ref(false);
const postsLoadingMore = ref(false);
const postsHasMore = ref(true);
const postsError = ref("");
const postsLoadMoreError = ref("");
const currentCursor = ref<PostCursor | null>(null);
const myHelpfulMap = ref<Record<string, boolean>>({});

let currentQueryToken = 0;
let activeFilterState: FetchPostsOptions = {};
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
    createdAtIso: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at || Date.now()).toISOString(),
    updatedAt: row.updated_at ? (typeof row.updated_at === "number" ? row.updated_at : new Date(row.updated_at).getTime()) : Date.now()
  };
};

const buildPostsQuery = (
  options: FetchPostsOptions,
  cursor: PostCursor | null,
  limitCount: number
) => {
  let query = supabase.from("posts").select("*");

  // Server-side type / status filter
  if (options.filter === "Lost") {
    query = query.eq("type", "lost");
  } else if (options.filter === "Found") {
    query = query.eq("type", "found");
  } else if (options.filter === "Resolved") {
    query = query.in("status", ["resolved", "returned", "claimed"]);
  }

  // Server-side category filter
  if (options.categories && options.categories.length > 0) {
    query = query.in("category", options.categories);
  }

  // Server-side subcategory filter
  if (options.subcategories && options.subcategories.length > 0) {
    query = query.in("subcategory", options.subcategories);
  }

  // Server-side keyword search filter (title, description, location)
  if (options.search && options.search.trim()) {
    const cleanTerm = options.search.trim().replace(/[%_,'"()]/g, "");
    if (cleanTerm.length > 0) {
      query = query.or(
        `title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%,location.ilike.%${cleanTerm}%`
      );
    }
  }

  // Deterministic cursor pagination:
  // (created_at < cursor.createdAt) OR (created_at = cursor.createdAt AND id < cursor.id)
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limitCount);

  return query;
};

const matchesActiveFilters = (post: Post, options: FetchPostsOptions): boolean => {
  if (options.filter === "Lost" && post.type !== "lost") return false;
  if (options.filter === "Found" && post.type !== "found") return false;
  if (options.filter === "Resolved" && post.status !== "resolved" && post.status !== "returned") return false;

  if (options.categories && options.categories.length > 0) {
    const categoryKey = (value: string) => getCategoryConfig(value)?.key || normalizeCategoryKey(value);
    const selectedKeys = new Set(options.categories.map(categoryKey));
    if (!selectedKeys.has(categoryKey(post.category))) return false;
  }

  if (options.subcategories && options.subcategories.length > 0) {
    if (!post.subCategory) return false;
    const selectedSubKeys = new Set(options.subcategories.map(normalizeCategoryKey));
    if (!selectedSubKeys.has(normalizeCategoryKey(post.subCategory))) return false;
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    const match = [
      post.title,
      post.description,
      post.location,
      post.category,
      post.subCategory
    ].some((text) => (text || "").toLowerCase().includes(q));
    if (!match) return false;
  }

  return true;
};

const handleRealtimeInsert = (row: any) => {
  const newPost = mapPostRow(row);
  if (!matchesActiveFilters(newPost, activeFilterState)) return;
  if (posts.value.some((p) => p.id === newPost.id)) return;
  posts.value = [newPost, ...posts.value];
};

const handleRealtimeUpdate = (row: any) => {
  const updatedPost = mapPostRow(row);
  const idx = posts.value.findIndex((p) => p.id === updatedPost.id);
  if (idx !== -1) {
    if (matchesActiveFilters(updatedPost, activeFilterState)) {
      posts.value[idx] = { ...posts.value[idx], ...updatedPost };
    } else {
      posts.value.splice(idx, 1);
    }
  }
};

const handleRealtimeDelete = (oldRow: any) => {
  const deletedId = oldRow?.id;
  if (deletedId) {
    posts.value = posts.value.filter((p) => p.id !== deletedId);
  }
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

  const fetchPosts = async (options: FetchPostsOptions = {}): Promise<Post[]> => {
    const limitCount = options.limit || POSTS_PAGE_SIZE;
    const isRefresh = Boolean(options.isRefresh);
    const token = ++currentQueryToken;
    activeFilterState = { ...options };

    if (posts.value.length === 0 && !isRefresh) {
      postsLoading.value = true;
    } else {
      postsRefreshing.value = true;
    }
    postsError.value = "";
    postsLoadMoreError.value = "";

    const startTime = performance.now();

    inFlightPostsPromise = (async () => {
      try {
        const query = buildPostsQuery(options, null, limitCount);
        const { data, error } = await query;

        if (token !== currentQueryToken) {
          return posts.value;
        }

        if (error) throw error;

        const loaded: Post[] = (data || []).map(mapPostRow);
        posts.value = loaded;

        if (loaded.length > 0) {
          const last = loaded[loaded.length - 1];
          currentCursor.value = {
            createdAt: last.createdAtIso || new Date(last.createdAt).toISOString(),
            id: last.id
          };
        } else {
          currentCursor.value = null;
        }

        postsHasMore.value = loaded.length === limitCount;

        if (import.meta.env.DEV) {
          const elapsed = (performance.now() - startTime).toFixed(1);
          console.log(`[Perf] Posts batch: ${elapsed} ms (${loaded.length} posts, hasMore: ${postsHasMore.value})`);
        }

        return loaded;
      } catch (error) {
        if (token !== currentQueryToken) return posts.value;
        if (import.meta.env.DEV) {
          console.error("Posts fetch error:", error);
        }
        postsError.value = "Failed to load community posts.";
        return posts.value;
      } finally {
        if (token === currentQueryToken) {
          postsLoading.value = false;
          postsRefreshing.value = false;
        }
        inFlightPostsPromise = null;
      }
    })();

    if (currentUser.value?.uid) {
      loadMyHelpful(currentUser.value.uid);
    }

    return inFlightPostsPromise;
  };

  const loadMorePosts = async (): Promise<Post[]> => {
    if (postsLoading.value || postsLoadingMore.value || !postsHasMore.value || !currentCursor.value) {
      return posts.value;
    }

    const token = currentQueryToken;
    postsLoadingMore.value = true;
    postsLoadMoreError.value = "";

    try {
      const query = buildPostsQuery(activeFilterState, currentCursor.value, POSTS_PAGE_SIZE);
      const { data, error } = await query;

      if (token !== currentQueryToken) {
        return posts.value;
      }

      if (error) throw error;

      const loaded: Post[] = (data || []).map(mapPostRow);

      if (loaded.length > 0) {
        const existingIds = new Set(posts.value.map((p) => p.id));
        const newUnique = loaded.filter((p) => !existingIds.has(p.id));
        posts.value = [...posts.value, ...newUnique];

        const last = loaded[loaded.length - 1];
        currentCursor.value = {
          createdAt: last.createdAtIso || new Date(last.createdAt).toISOString(),
          id: last.id
        };
      }

      postsHasMore.value = loaded.length === POSTS_PAGE_SIZE;

      return posts.value;
    } catch (error) {
      if (token !== currentQueryToken) return posts.value;
      if (import.meta.env.DEV) {
        console.error("Posts load-more error:", error);
      }
      postsLoadMoreError.value = "Failed to load more posts.";
      return posts.value;
    } finally {
      if (token === currentQueryToken) {
        postsLoadingMore.value = false;
      }
    }
  };

  const subscribeToPosts = (options: FetchPostsOptions = {}) => {
    fetchPosts(options);

    if (!realtimeChannelSubscribed) {
      realtimeChannelSubscribed = true;
      try {
        supabase
          .channel("public:posts")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
            handleRealtimeInsert(payload.new);
          })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
            handleRealtimeUpdate(payload.new);
          })
          .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
            handleRealtimeDelete(payload.old);
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
    } catch {
      /* ignore storage read error */
    }
  };

  const saveMyHelpful = (uid: string) => {
    try {
      localStorage.setItem(`user_helpful_${uid}`, JSON.stringify(myHelpfulMap.value));
    } catch {
      /* ignore storage write error */
    }
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
        } catch {
          /* ignore subcategory upsert error */
        }
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
    } catch {
      /* ignore comments cleanup error */
    }

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
    postsLoadingMore,
    postsHasMore,
    postsError,
    postsLoadMoreError,
    currentCursor,
    POSTS_PAGE_SIZE,
    fetchPosts,
    loadMorePosts,
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
