# Retrv — Data Model & Schema Architecture

> **Source of Truth:** Live PostgreSQL schema defined in [supabase-schema.sql](../../supabase-schema.sql).  
> **Schema Reality:** All 11 tables currently lack foreign key constraints (`REFERENCES`). Relational integrity is enforced conceptually by client-side application logic.

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ POSTS : "conceptual (author_id = profiles.id) [NO FK]"
    PROFILES ||--o{ COMMENTS : "conceptual (author_id = profiles.id) [NO FK]"
    PROFILES ||--o{ ACHIEVEMENTS : "conceptual (user_id = profiles.id) [NO FK]"
    PROFILES ||--o{ NOTIFICATIONS : "conceptual (user_id = profiles.id) [NO FK]"
    PROFILES ||--o{ PUSH_TOKENS : "conceptual (user_id = profiles.id) [NO FK]"
    PROFILES ||--o| NOTIFICATION_PREFERENCES : "conceptual (user_id = profiles.id) [NO FK]"
    POSTS ||--o{ COMMENTS : "conceptual (post_id = posts.id) [NO FK]"
    POSTS ||--o{ ACHIEVEMENTS : "conceptual (post_id = posts.id) [NO FK]"
    CONVERSATIONS ||--o{ MESSAGES : "conceptual (conversation_id = conversations.id) [NO FK]"

    PROFILES {
        text id PK
        text name
        text username UK
        text phone
        text email
        text avatar_url
        text avatar_key
        timestamptz created_at
        timestamptz updated_at
    }

    POSTS {
        text id PK
        text author_id
        text author_name
        text author_username
        text author_avatar
        text title
        text description
        text category
        text subcategory
        text location
        text type
        text status
        jsonb photos
        text resolved_to
        timestamptz resolved_at
        uuid client_request_id
        timestamptz created_at
        timestamptz updated_at
    }

    COMMENTS {
        text id PK
        text post_id
        text author_id
        text author_name
        text author_username
        text author_avatar
        text content
        uuid client_request_id
        timestamptz created_at
    }

    CONVERSATIONS {
        text id PK
        jsonb participant_ids
        jsonb participants
        text post_id
        text post_title
        text last_message
        timestamptz last_message_at
        jsonb unread_counts
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        text id PK
        text conversation_id
        text sender_id
        text sender_name
        text text
        text image_url
        text thread_id
        text post_id
        boolean read
        uuid client_request_id
        timestamptz created_at
    }

    NOTIFICATIONS {
        text id PK
        text user_id
        text type
        text title
        text body
        jsonb data
        boolean is_read
        timestamptz created_at
    }

    PUSH_TOKENS {
        text id PK
        text user_id
        text token
        text platform
        timestamptz updated_at
        timestamptz created_at
    }

    NOTIFICATION_PREFERENCES {
        text id PK
        text user_id
        boolean comments
        boolean replies
        boolean messages
        boolean merits
        boolean community_updates
        timestamptz updated_at
        timestamptz created_at
    }

    ACHIEVEMENTS {
        text id PK
        text user_id
        text badge_id
        text post_id
        text awarded_by
        timestamptz unlocked_at
    }

    SUBCATEGORIES {
        text id PK
        text category_key
        text name
        text created_by
        timestamptz created_at
    }

    LOST_FOUND {
        text id PK
        text title
        text status
        timestamptz created_at
    }
```

---

## 2. Table-by-Table Architectural Specification

| Table | Primary Key | Actual DB Constraints | Conceptual Relationships | Ownership / Sensitivity | Classification |
|---|---|---|---|---|---|
| `profiles` | `id` (TEXT) | `username UNIQUE` | Links to `auth.users(id)` | Owner: `id` | **Mixed** (name/username public; phone/email private) |
| `posts` | `id` (TEXT) | `type IN ('lost', 'found')`, `status IN ('open', 'resolved', 'claimed')` | `author_id` -> `profiles(id)` | Owner: `author_id` | **Public** (community feed items) |
| `comments` | `id` (TEXT) | None | `post_id` -> `posts(id)`, `author_id` -> `profiles(id)` | Owner: `author_id` | **Public** (community discussion) |
| `conversations` | `id` (TEXT) | None | `participant_ids` contains 2 user UIDs | Shared: participants | **Strictly Private** |
| `messages` | `id` (TEXT) | None | `conversation_id` -> `conversations(id)`, `sender_id` -> `profiles(id)` | Owner: `sender_id` | **Strictly Private** |
| `notifications` | `id` (TEXT) | None | `user_id` -> `profiles(id)` | Owner: `user_id` | **Strictly Private** |
| `push_tokens` | `id` (TEXT) | None | `user_id` -> `profiles(id)` | Owner: `user_id` | **Strictly Private** |
| `notification_preferences`| `id` (TEXT) | None | `user_id` -> `profiles(id)` | Owner: `user_id` | **Private** |
| `achievements` | `id` (TEXT) | Partial index on `(post_id, badge_id)` | `user_id` -> `profiles(id)`, `post_id` -> `posts(id)` | Owner: `user_id` | **Public** (profile display badges) |
| `subcategories` | `id` (TEXT) | None | `created_by` -> `profiles(id)` | Community created | **Public** |
| `lost_found` | `id` (TEXT) | None | Legacy activity tracking | System legacy | **Legacy** |

---

## 3. Structural Deficits & Critical Notes

1. **Foreign Key Deficit:** No table in the current schema contains `REFERENCES`. When records are deleted (e.g., a post), associated records (`comments`, `achievements`) are not cascaded by the database.
2. **Post Status Constraint Inconsistency:** The database CHECK constraint allows `('open', 'resolved', 'claimed')`, but frontend logic attempts to assign `'returned'` for found items, risking database insert/update rejections.
3. **Comment Threading Gap:** The TypeScript model defines `parent_comment_id` and `root_comment_id`, but neither column exists in the PostgreSQL `comments` table.
