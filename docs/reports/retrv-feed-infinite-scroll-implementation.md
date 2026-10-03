# Retrv — Feed Infinite Scroll Implementation

## Previous Loading Strategy
Previously, `usePosts.ts` executed a single bounded batch fetch:
```typescript
const { data, error } = await supabase
  .from("posts")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(25); // or 50
```
This loaded a fixed set of posts into client memory, and filtering (lost, found, resolved, categories, search queries) was performed entirely on the client side via `getFilteredPosts()`. When the user scrolled past the initial batch, no subsequent pages were fetched.

## New Pagination Strategy
The feed now employs true server-side keyset/cursor-based infinite scrolling:
1. Initial page loads a controlled batch (`POSTS_PAGE_SIZE = 12`) matching server-side active filters.
2. An end-of-feed sentinel element observed by `IntersectionObserver` detects when the user approaches the bottom of the feed (300px threshold).
3. `loadMorePosts()` requests only the subsequent batch strictly after the current cursor in `created_at DESC, id DESC` order.
4. Consecutive batches are deduplicated by canonical post ID and appended to `posts.value`.
5. When fewer than `POSTS_PAGE_SIZE` items are returned, `postsHasMore` is set to `false` and "You're all caught up" is displayed.

## Page Size
A centralized constant `POSTS_PAGE_SIZE = 12` is defined in `src/types/post.ts` and consumed across `usePosts.ts` and views.

## Sort Order
The deterministic sort order enforced by the database and preserved across realtime events is:
```sql
ORDER BY created_at DESC, id DESC
```
Using the post ID as a deterministic tie-breaker ensures stable ordering even if multiple posts share identical millisecond timestamps.

## Cursor Structure
The cursor is represented by the `PostCursor` interface:
```typescript
export interface PostCursor {
  createdAt: string; // ISO 8601 string from DB row
  id: string;        // Canonical post ID tie-breaker
}
```
In PostgREST / Supabase JS, the cursor query is constructed as:
```typescript
query = query.or(
  `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
);
```

## Filter Integration
Filters are applied server-side before pagination occurs:
- **Type / Status:**
  - `Lost` -> `.eq("type", "lost")`
  - `Found` -> `.eq("type", "found")`
  - `Resolved` -> `.in("status", ["resolved", "returned", "claimed"])`
- **Category:** `.in("category", categories)`
- **Subcategory:** `.in("subcategory", subcategories)`
- **Keyword Search:** `.or("title.ilike.%term%,description.ilike.%term%,location.ilike.%term%")`

When any filter or debounced search query changes:
- `postsLoading` is triggered.
- `currentCursor` is reset to `null`.
- `postsHasMore` is reset to `true`.
- An incremental query generation token (`currentQueryToken`) prevents out-of-order race conditions from stale requests.

## Realtime Interaction
Realtime updates via `public:posts` now use granular event handlers instead of blanket refetches:
- **INSERT:** Incoming posts are checked against active filters (`matchesActiveFilters`). If matching and not already in `posts.value`, the post is prepended to the top of the feed. The pagination cursor at the bottom remains unaffected.
- **UPDATE:** The updated post is reconciled in-place. If an update causes a post to no longer match active filters (e.g. marked resolved while filter is "Lost"), it is removed from the current feed.
- **DELETE:** The deleted post is filtered out from local state without requiring a full reload.

## Deduplication
Before appending any fetched batch in `loadMorePosts()`, canonical IDs are validated against existing records:
```typescript
const existingIds = new Set(posts.value.map((p) => p.id));
const newUnique = loaded.filter((p) => !existingIds.has(p.id));
posts.value = [...posts.value, ...newUnique];
```

## Loading States
Loading states are segregated:
- **Initial Feed Load:** `postsLoading` displays the existing skeleton card placeholders (`PostCardSkeleton`).
- **Incremental Load:** `postsLoadingMore` displays a compact bottom row with a subtle CSS spinner and `Loading more posts...`.
- **Feed Refresh:** `postsRefreshing` handles pull-to-refresh without clearing the existing screen contents.

## Error Handling
- **Initial Fetch Failure:** Displays user-friendly error container with a "Retry" button.
- **Load-More Failure:** Preserves all previously loaded posts, halts the spinner, and presents a compact "Couldn't load more posts" indicator with an inline "Retry" button.

## Files Changed
- `src/types/post.ts` — Added `POSTS_PAGE_SIZE`, `PostCursor`, `FetchPostsOptions`, and `createdAtIso` to `Post`.
- `src/composables/usePosts.ts` — Implemented cursor pagination, query builder, loadMorePosts, token race guards, and granular realtime handlers.
- `src/views/HomePage.vue` — Added sentinel markup, compact spinner, IntersectionObserver integration, reactive filter watcher, and load-more retry.
- `tests/unit/cursor-pagination.spec.ts` — Added unit test validating pagination contracts and deduplication.

## Validation
- `git diff --check`: PASS (0 whitespace/syntax issues).
- `npx eslint src/types/post.ts src/composables/usePosts.ts src/views/HomePage.vue tests/unit/cursor-pagination.spec.ts`: PASS (0 errors, 0 warnings).
- `npx vitest run tests/unit/cursor-pagination.spec.ts`: PASS (3/3 tests passed).
- `npm run build`: PASS (`vue-tsc --noEmit` and `vite build` completed with code 0).

## Known Limitations
- The desktop shell scroll owner (`ion-page.app-shell-page`) and mobile `ion-content` both rely on standard document viewport intersection. If a platform browser disables `IntersectionObserver`, sentinel triggers will fall back to manual refresh.

## Deferred Search Improvements
- Server-side search currently utilizes multi-column `ILIKE` across `title`, `description`, and `location`. For large datasets in Phase 2, a PostgreSQL full-text search index (`tsvector` with GIN index) or pg_trgm extension should be provisioned via a timestamped migration.
