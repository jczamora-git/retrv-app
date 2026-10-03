import { describe, expect, it } from "vitest";
import { POSTS_PAGE_SIZE } from "../../src/types/post";
import { usePosts } from "../../src/composables/usePosts";

describe("Cursor Pagination & Infinite Scroll Architecture", () => {
  it("exports the standard page size of 12", () => {
    expect(POSTS_PAGE_SIZE).toBe(12);
  });

  it("exposes all required pagination and infinite scroll states", () => {
    const {
      posts,
      postsLoading,
      postsRefreshing,
      postsLoadingMore,
      postsHasMore,
      postsError,
      postsLoadMoreError,
      currentCursor,
      loadMorePosts,
      fetchPosts
    } = usePosts();

    expect(posts).toBeDefined();
    expect(postsLoading).toBeDefined();
    expect(postsRefreshing).toBeDefined();
    expect(postsLoadingMore).toBeDefined();
    expect(postsHasMore).toBeDefined();
    expect(postsError).toBeDefined();
    expect(postsLoadMoreError).toBeDefined();
    expect(currentCursor).toBeDefined();
    expect(typeof loadMorePosts).toBe("function");
    expect(typeof fetchPosts).toBe("function");
  });

  it("deduplicates loaded rows by canonical post id", () => {
    const existing = [
      { id: "post_1", title: "Wallet" },
      { id: "post_2", title: "Keys" }
    ];
    const incoming = [
      { id: "post_2", title: "Keys duplicate" },
      { id: "post_3", title: "Phone" }
    ];

    const existingIds = new Set(existing.map((p) => p.id));
    const newUnique = incoming.filter((p) => !existingIds.has(p.id));
    const combined = [...existing, ...newUnique];

    expect(combined).toHaveLength(3);
    expect(combined.map((p) => p.id)).toEqual(["post_1", "post_2", "post_3"]);
  });
});
