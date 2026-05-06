const assert = require('node:assert/strict');
const test = require('node:test');

const workerModule = import('../../worker/analytics-worker.mjs');

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.bindings = [];
  }

  bind(...bindings) {
    this.bindings = bindings;
    return this;
  }

  async run() {
    this.db.runs.push({ sql: this.sql, bindings: this.bindings });
    return { success: true };
  }

  async first() {
    this.db.firsts.push({ sql: this.sql, bindings: this.bindings });
    return {
      total_events: 12,
      opens: 4,
      uploads: 3,
      exports: 2,
      completions: 1,
    };
  }

  async all() {
    this.db.alls.push({ sql: this.sql, bindings: this.bindings });
    return {
      results: [
        {
          tool_id: 'image_resize',
          tool_name: 'Resize an Image',
          tool_type: 'free_tool',
          tool_category: 'image',
          opens: 4,
          uploads: 3,
          exports: 2,
          completions: 1,
          output_format: 'image/webp',
          events: 2,
          file_size_bucket: '1mb_5mb',
          day: '2026-05-06',
          week: '2026-W18',
        },
      ],
    };
  }
}

class FakeDb {
  constructor() {
    this.runs = [];
    this.firsts = [];
    this.alls = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

const createEnv = () => ({
  ANALYTICS_DB: new FakeDb(),
  ALLOWED_ORIGINS: 'https://kreativtools.com',
  ADMIN_TOKEN: 'secret',
  ADMIN_USER: 'admin',
});

test('analytics worker stores allow-listed anonymous events', async () => {
  const worker = (await workerModule).default;
  const env = createEnv();

  const response = await worker.fetch(new Request('https://kreativtools.com/api/analytics/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://kreativtools.com',
    },
    body: JSON.stringify({
      event: 'tool_file_loaded',
      properties: {
        tool_id: 'image_resize',
        tool_name: 'Resize an Image',
        tool_type: 'free_tool',
        tool_category: 'image',
        route: '/image/resize/',
        file_kind: 'image',
        file_count: 1,
        file_size_bucket: '1mb_5mb',
        filename: 'private-name.png',
      },
    }),
  }), env);

  assert.equal(response.status, 202);
  assert.equal(env.ANALYTICS_DB.runs.length, 1);
  assert.equal(env.ANALYTICS_DB.runs[0].bindings[0], 'tool_file_loaded');
  assert.equal(env.ANALYTICS_DB.runs[0].bindings.includes('private-name.png'), false);
});

test('analytics worker rejects unknown events', async () => {
  const worker = (await workerModule).default;
  const env = createEnv();

  const response = await worker.fetch(new Request('https://kreativtools.com/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'user_email_captured',
      properties: { email: 'person@example.com' },
    }),
  }), env);

  assert.equal(response.status, 400);
  assert.equal(env.ANALYTICS_DB.runs.length, 0);
});

test('analytics worker protects the private dashboard', async () => {
  const worker = (await workerModule).default;
  const env = createEnv();

  const blocked = await worker.fetch(new Request('https://kreativtools.com/admin/stats'), env);
  assert.equal(blocked.status, 401);

  const auth = Buffer.from('admin:secret').toString('base64');
  const allowed = await worker.fetch(new Request('https://kreativtools.com/admin/stats', {
    headers: { Authorization: `Basic ${auth}` },
  }), env);

  assert.equal(allowed.status, 200);
  assert.match(await allowed.text(), /Kreativ Analytics/);
  assert.equal(env.ANALYTICS_DB.firsts.length, 1);
});
