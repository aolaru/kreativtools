# Kreativ Tools Product Analytics Worker

This Worker stores anonymous product events in Cloudflare D1 and exposes a private stats dashboard.

## Endpoints

- `POST /api/analytics/events`: anonymous browser event ingest.
- `GET /admin/stats`: private HTML dashboard.
- `GET /api/admin/stats`: private JSON dashboard data.
- `GET /api/analytics/health`: D1 binding health check.

## Privacy Rules

The ingest endpoint only accepts allow-listed event names and allow-listed metadata fields. Do not send filenames, file contents, exact file sizes, email addresses, IP addresses, user IDs, or document text.

Accepted event names:

- `tool_opened`
- `workflow_opened`
- `tool_file_loaded`
- `tool_export_clicked`
- `tool_download_clicked`
- `workflow_completed`

Accepted metadata:

- `tool_id`
- `tool_name`
- `tool_type`
- `tool_category`
- `route`
- `action`
- `control_id`
- `file_kind`
- `file_count`
- `file_size_bucket`
- `total_size_bucket`
- `output_format`
- `workflow_step`
- `event_source`

## Setup

1. Copy `worker/wrangler.toml.example` to `worker/wrangler.toml`.
2. Create the D1 database:

```sh
npx wrangler d1 create kreativtools_analytics
```

3. Paste the returned `database_id` into `worker/wrangler.toml`.
4. Apply the schema:

```sh
npx wrangler d1 execute kreativtools_analytics --file worker/schema.sql
```

5. Set the private dashboard token:

```sh
npx wrangler secret put ADMIN_TOKEN
```

6. Deploy:

```sh
npx wrangler deploy --config worker/wrangler.toml
```

## Viewing Stats

Open:

```text
https://kreativtools.com/admin/stats
```

Use the configured `ADMIN_USER` and `ADMIN_TOKEN` as Basic Auth credentials.

For JSON:

```text
https://kreativtools.com/api/admin/stats?days=30
```
