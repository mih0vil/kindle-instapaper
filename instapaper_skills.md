# Instapaper API Skills

This document describes the skills and procedures for interacting with the Instapaper Full Developer API (v1).

## Base Configuration

- **Base URL:** `https://www.instapaper.com`
- **Authentication:** OAuth 1.0a (HMAC-SHA1 only)
- **Data Format:** JSON (default) or `qline` (custom query-string line format)
- **Method:** All requests MUST use **POST**.
- **Parameters:** MUST be passed in the POST request body (except OAuth parameters which go in the `Authorization` header).
- **Required:** HTTPS for all endpoints.

## Authentication (xAuth)

To obtain an access token, use the xAuth flow.

### Endpoint: `/api/1/oauth/access_token`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `x_auth_username` | Yes | User's email or username |
| `x_auth_password` | Yes* | User's password (if they have one) |
| `x_auth_mode` | Yes | Must be `client_auth` |

*Note: If an account doesn't have a password, any value works, but authentication fails if a password exists and is incorrect.*

**Response (qline format):**
`oauth_token=ACCESS_TOKEN&oauth_token_secret=ACCESS_TOKEN_SECRET`

## Account Methods

### `POST /api/1/account/verify_credentials`
Returns the currently logged-in user.

**Response:**
```json
[{"type":"user", "user_id": 12345, "username": "user@example.com"}]
```

## Bookmark Methods

### `POST /api/1/bookmarks/list`
Lists unread bookmarks and synchronizes reading positions.

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int | 1-500 (default 25) |
| `folder_id` | string | `unread` (default), `starred`, `archive`, or numeric ID |
| `have` | string | Comma-separated `bookmark_id:hash:progress:timestamp` |
| `highlights` | string | `-` delimited highlight IDs |

### `POST /api/1/bookmarks/add`
Adds a new bookmark.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes* | The URL to save |
| `title` | No | Title (lookup performed if omitted) |
| `description` | No | Brief summary |
| `folder_id` | No | Numeric folder ID |
| `resolve_final_url` | No | `1` (default) to resolve redirects |
| `content` | No | Full HTML content (required for private sources) |
| `is_private_from_source` | No | Source label for private bookmarks |

### `POST /api/1/bookmarks/delete`
Permanently deletes a bookmark.
- Params: `bookmark_id`

### `POST /api/1/bookmarks/star` / `unstar`
Stars or un-stars a bookmark.
- Params: `bookmark_id`

### `POST /api/1/bookmarks/archive` / `unarchive`
Moves to Archive or back to Unread.
- Params: `bookmark_id`

### `POST /api/1/bookmarks/move`
Moves bookmark to a user folder.
- Params: `bookmark_id`, `folder_id`

### `POST /api/1/bookmarks/get_text`
Returns processed text-view HTML. (Personal use only)
- Params: `bookmark_id`

## Folder Methods

### `POST /api/1/folders/list`
Lists user-created organizational folders.

### `POST /api/1/folders/add`
Creates a folder.
- Params: `title`

### `POST /api/1/folders/delete`
Deletes a folder (moves content to Archive).
- Params: `folder_id`

### `POST /api/1/folders/set_order`
Re-orders folders.
- Params: `order` (Format: `folder_id:position,folder_id:position`)

## Highlight Methods

### `POST /api/1.1/bookmarks/<bookmark-id>/highlights`
Lists highlights for a bookmark.

### `POST /api/1.1/bookmarks/<bookmark-id>/highlight`
Creates a highlight.
- Params: `text`, `position` (optional)

### `POST /api/1.1/highlights/<highlight-id>/delete`
Deletes a highlight.

## Common Error Codes

- `1040`: Rate-limit exceeded
- `1041`: Premium account required
- `1220`: Domain requires full content (use `content` param)
- `1221`: Domain opted out of Instapaper
- `1240`: Invalid URL
- `1241`: Invalid bookmark_id
- `1251`: Duplicate folder title
- `1500`: Unexpected service error
- `1600`: Empty highlight text

# Postmark API Skills

Skills available at @postmark_skills.md

