const ALLOWED_EVENTS = new Set([
  'tool_opened',
  'workflow_opened',
  'tool_file_loaded',
  'tool_export_clicked',
  'tool_download_clicked',
  'workflow_completed',
]);

const ALLOWED_PROPERTIES = new Set([
  'action',
  'control_id',
  'event_source',
  'file_count',
  'file_kind',
  'file_size_bucket',
  'output_format',
  'route',
  'tool_category',
  'tool_id',
  'tool_name',
  'tool_type',
  'total_size_bucket',
  'workflow_step',
]);

const DEFAULT_ORIGIN = 'https://kreativtools.com';
const MAX_BODY_BYTES = 8192;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  },
});

const html = (body, status = 200, headers = {}) => new Response(body, {
  status,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  },
});

const getAllowedOrigins = (env) => String(env.ALLOWED_ORIGINS || DEFAULT_ORIGIN)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin');
  const allowed = getAllowedOrigins(env);
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const clampString = (value, max = 120) => {
  if (value === undefined || value === null || value === '') return null;
  return String(value).slice(0, max);
};

const clampInteger = (value, min = 0, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

const safePayload = (payload) => {
  const eventName = clampString(payload?.event || payload?.eventName, 80);
  if (!ALLOWED_EVENTS.has(eventName)) return null;

  const properties = payload?.properties && typeof payload.properties === 'object' ? payload.properties : {};
  const safeProperties = {};

  Object.entries(properties).forEach(([key, value]) => {
    if (!ALLOWED_PROPERTIES.has(key)) return;
    if (key === 'file_count') {
      safeProperties[key] = clampInteger(value);
      return;
    }
    safeProperties[key] = clampString(value);
  });

  return { eventName, properties: safeProperties };
};

const requireDb = (env) => {
  if (!env.ANALYTICS_DB) {
    throw new Error('Missing ANALYTICS_DB D1 binding.');
  }
  return env.ANALYTICS_DB;
};

const insertEvent = async (db, eventName, properties) => db.prepare(`
  INSERT INTO analytics_events (
    event_name,
    tool_id,
    tool_name,
    tool_type,
    tool_category,
    route,
    action,
    control_id,
    file_kind,
    file_count,
    file_size_bucket,
    total_size_bucket,
    output_format,
    workflow_step,
    event_source
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  eventName,
  properties.tool_id || null,
  properties.tool_name || null,
  properties.tool_type || null,
  properties.tool_category || null,
  properties.route || null,
  properties.action || null,
  properties.control_id || null,
  properties.file_kind || null,
  properties.file_count ?? null,
  properties.file_size_bucket || null,
  properties.total_size_bucket || null,
  properties.output_format || null,
  properties.workflow_step || null,
  properties.event_source || 'browser'
).run();

const parseBody = async (request) => {
  const contentLength = Number.parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) return null;

  try {
    return await request.json();
  } catch {
    return null;
  }
};

const handleIngest = async (request, env) => {
  const headers = corsHeaders(request, env);
  const payload = await parseBody(request);
  const safe = safePayload(payload);

  if (!safe) return json({ ok: false, error: 'invalid_event' }, 400, headers);

  const db = requireDb(env);
  await insertEvent(db, safe.eventName, safe.properties);

  return json({ ok: true }, 202, headers);
};

const decodeBasicAuth = (value) => {
  if (!value?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(value.slice(6));
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;
    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
};

const isAuthorized = (request, env) => {
  const token = env.ADMIN_TOKEN;
  const user = env.ADMIN_USER || 'admin';
  if (!token) return false;

  const authorization = request.headers.get('Authorization') || '';
  if (authorization === `Bearer ${token}`) return true;

  const basic = decodeBasicAuth(authorization);
  return Boolean(basic && basic.user === user && basic.password === token);
};

const unauthorized = () => new Response('Authentication required', {
  status: 401,
  headers: {
    'WWW-Authenticate': 'Basic realm="Kreativ Analytics"',
    'Cache-Control': 'no-store',
  },
});

const sinceDate = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const rows = async (db, sql, ...bindings) => {
  const result = await db.prepare(sql).bind(...bindings).all();
  return result.results || [];
};

const first = async (db, sql, ...bindings) => {
  const result = await db.prepare(sql).bind(...bindings).first();
  return result || {};
};

const getStats = async (env, days) => {
  const db = requireDb(env);
  const since = sinceDate(days);
  const summary = await first(db, `
    SELECT
      COUNT(*) AS total_events,
      SUM(CASE WHEN event_name IN ('tool_opened', 'workflow_opened') THEN 1 ELSE 0 END) AS opens,
      SUM(CASE WHEN event_name = 'tool_file_loaded' THEN 1 ELSE 0 END) AS uploads,
      SUM(CASE WHEN event_name = 'tool_export_clicked' THEN 1 ELSE 0 END) AS exports,
      SUM(CASE WHEN event_name IN ('tool_download_clicked', 'workflow_completed') THEN 1 ELSE 0 END) AS completions
    FROM analytics_events
    WHERE created_at >= ?
  `, since);

  const mostUsedTools = await rows(db, `
    SELECT tool_id, tool_name, tool_type, tool_category, COUNT(*) AS opens
    FROM analytics_events
    WHERE created_at >= ?
      AND event_name IN ('tool_opened', 'workflow_opened')
      AND tool_id IS NOT NULL
    GROUP BY tool_id, tool_name, tool_type, tool_category
    ORDER BY opens DESC, tool_id ASC
    LIMIT 20
  `, since);

  const funnelByTool = await rows(db, `
    SELECT
      tool_id,
      COALESCE(tool_name, tool_id) AS tool_name,
      tool_type,
      SUM(CASE WHEN event_name IN ('tool_opened', 'workflow_opened') THEN 1 ELSE 0 END) AS opens,
      SUM(CASE WHEN event_name = 'tool_file_loaded' THEN 1 ELSE 0 END) AS uploads,
      SUM(CASE WHEN event_name = 'tool_export_clicked' THEN 1 ELSE 0 END) AS exports,
      SUM(CASE WHEN event_name IN ('tool_download_clicked', 'workflow_completed') THEN 1 ELSE 0 END) AS completions
    FROM analytics_events
    WHERE created_at >= ? AND tool_id IS NOT NULL
    GROUP BY tool_id, tool_name, tool_type
    ORDER BY completions DESC, uploads DESC, opens DESC
    LIMIT 30
  `, since);

  const outputFormats = await rows(db, `
    SELECT output_format, COUNT(*) AS events
    FROM analytics_events
    WHERE created_at >= ? AND output_format IS NOT NULL
    GROUP BY output_format
    ORDER BY events DESC, output_format ASC
    LIMIT 20
  `, since);

  const fileSizeRanges = await rows(db, `
    SELECT file_size_bucket, COUNT(*) AS uploads
    FROM analytics_events
    WHERE created_at >= ?
      AND event_name = 'tool_file_loaded'
      AND file_size_bucket IS NOT NULL
    GROUP BY file_size_bucket
    ORDER BY uploads DESC
  `, since);

  const dailyTrend = await rows(db, `
    SELECT
      substr(created_at, 1, 10) AS day,
      SUM(CASE WHEN event_name = 'tool_file_loaded' THEN 1 ELSE 0 END) AS uploads,
      SUM(CASE WHEN event_name = 'tool_export_clicked' THEN 1 ELSE 0 END) AS exports,
      SUM(CASE WHEN event_name IN ('tool_download_clicked', 'workflow_completed') THEN 1 ELSE 0 END) AS completions
    FROM analytics_events
    WHERE created_at >= ?
    GROUP BY day
    ORDER BY day DESC
    LIMIT 31
  `, since);

  const weeklyTrend = await rows(db, `
    SELECT
      strftime('%Y-W%W', created_at) AS week,
      SUM(CASE WHEN event_name = 'tool_file_loaded' THEN 1 ELSE 0 END) AS uploads,
      SUM(CASE WHEN event_name = 'tool_export_clicked' THEN 1 ELSE 0 END) AS exports,
      SUM(CASE WHEN event_name IN ('tool_download_clicked', 'workflow_completed') THEN 1 ELSE 0 END) AS completions
    FROM analytics_events
    WHERE created_at >= ?
    GROUP BY week
    ORDER BY week DESC
    LIMIT 12
  `, since);

  return {
    days,
    generated_at: new Date().toISOString(),
    summary,
    most_used_tools: mostUsedTools,
    funnel_by_tool: funnelByTool,
    output_formats: outputFormats,
    file_size_ranges: fileSizeRanges,
    daily_trend: dailyTrend,
    weekly_trend: weeklyTrend,
  };
};

const percentage = (numerator, denominator) => {
  if (!denominator) return '0%';
  return `${Math.round((Number(numerator || 0) / Number(denominator || 0)) * 100)}%`;
};

const renderTable = (columns, rowsData, emptyText = 'No data yet.') => {
  if (!rowsData.length) return `<p class="empty">${escapeHtml(emptyText)}</p>`;

  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rowsData.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.render ? column.render(row) : row[column.key])}</td>`).join('')}</tr>`).join('');

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

const renderDashboard = (stats) => {
  const summary = stats.summary || {};
  const completionRate = percentage(summary.completions, summary.uploads);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kreativ Analytics</title>
  <style>
    :root { color-scheme: light; --bg:#eef6ff; --card:#ffffff; --ink:#101827; --muted:#66758a; --line:#d7e4f3; --accent:#2384d6; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
    main { max-width: 1180px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: clamp(2rem, 4vw, 3.25rem); letter-spacing: -0.05em; }
    h2 { margin: 0 0 16px; font-size: 1.2rem; letter-spacing: -0.03em; }
    p { color: var(--muted); }
    .hero { display: flex; justify-content: space-between; gap: 20px; align-items: end; margin-bottom: 24px; }
    .pill { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; background: rgba(255,255,255,.72); font-weight: 800; color: var(--muted); }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 16px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 18px; box-shadow: 0 16px 40px rgba(21, 40, 70, .06); }
    .metric strong { display: block; font-size: 2rem; letter-spacing: -0.05em; }
    .metric span { color: var(--muted); font-weight: 700; }
    .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-size: .76rem; text-transform: uppercase; letter-spacing: .08em; }
    .empty { margin: 0; }
    @media (max-width: 900px) { body { padding: 18px; } .hero, .section-grid { display: block; } .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .card { margin-bottom: 16px; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <span class="pill">Private Product Analytics</span>
        <h1>Kreativ Analytics</h1>
        <p>Anonymous tool and workflow usage for the last ${escapeHtml(stats.days)} days. Generated ${escapeHtml(stats.generated_at)}.</p>
      </div>
      <a class="pill" href="/api/admin/stats?days=${escapeHtml(stats.days)}">JSON API</a>
    </section>

    <section class="grid" aria-label="Summary metrics">
      <article class="card metric"><span>Total events</span><strong>${escapeHtml(summary.total_events || 0)}</strong></article>
      <article class="card metric"><span>Uploads started</span><strong>${escapeHtml(summary.uploads || 0)}</strong></article>
      <article class="card metric"><span>Exports clicked</span><strong>${escapeHtml(summary.exports || 0)}</strong></article>
      <article class="card metric"><span>Download success</span><strong>${escapeHtml(completionRate)}</strong></article>
    </section>

    <section class="section-grid">
      <article class="card">
        <h2>Most Used Tools</h2>
        ${renderTable([
    { label: 'Tool', render: (row) => row.tool_name || row.tool_id },
    { label: 'Type', key: 'tool_type' },
    { label: 'Opens', key: 'opens' },
  ], stats.most_used_tools)}
      </article>

      <article class="card">
        <h2>Popular Output Formats</h2>
        ${renderTable([
    { label: 'Format', key: 'output_format' },
    { label: 'Events', key: 'events' },
  ], stats.output_formats)}
      </article>

      <article class="card">
        <h2>Conversion Funnel</h2>
        ${renderTable([
    { label: 'Tool', render: (row) => row.tool_name || row.tool_id },
    { label: 'Uploads', key: 'uploads' },
    { label: 'Exports', key: 'exports' },
    { label: 'Done', key: 'completions' },
    { label: 'Rate', render: (row) => percentage(row.completions, row.uploads) },
  ], stats.funnel_by_tool)}
      </article>

      <article class="card">
        <h2>File Size Ranges</h2>
        ${renderTable([
    { label: 'Range', key: 'file_size_bucket' },
    { label: 'Uploads', key: 'uploads' },
  ], stats.file_size_ranges)}
      </article>

      <article class="card">
        <h2>Daily Trend</h2>
        ${renderTable([
    { label: 'Day', key: 'day' },
    { label: 'Uploads', key: 'uploads' },
    { label: 'Exports', key: 'exports' },
    { label: 'Done', key: 'completions' },
  ], stats.daily_trend)}
      </article>

      <article class="card">
        <h2>Weekly Trend</h2>
        ${renderTable([
    { label: 'Week', key: 'week' },
    { label: 'Uploads', key: 'uploads' },
    { label: 'Exports', key: 'exports' },
    { label: 'Done', key: 'completions' },
  ], stats.weekly_trend)}
      </article>
    </section>
  </main>
</body>
</html>`;
};

const parseDays = (url) => {
  const days = Number.parseInt(url.searchParams.get('days') || '30', 10);
  if (!Number.isFinite(days)) return 30;
  return Math.min(365, Math.max(1, days));
};

const handleStats = async (request, env, format) => {
  if (!isAuthorized(request, env)) return unauthorized();

  const url = new URL(request.url);
  const stats = await getStats(env, parseDays(url));

  if (format === 'json') return json(stats);
  return html(renderDashboard(stats));
};

const notFound = () => json({ ok: false, error: 'not_found' }, 404);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/api/analytics/events') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/api/analytics/events') {
        return await handleIngest(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/admin/stats') {
        return await handleStats(request, env, 'html');
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/stats') {
        return await handleStats(request, env, 'json');
      }

      if (request.method === 'GET' && url.pathname === '/api/analytics/health') {
        requireDb(env);
        return json({ ok: true });
      }

      return notFound();
    } catch (error) {
      return json({ ok: false, error: error.message || 'server_error' }, 500);
    }
  },
};
