CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  tool_id TEXT,
  tool_name TEXT,
  tool_type TEXT,
  tool_category TEXT,
  route TEXT,
  action TEXT,
  control_id TEXT,
  file_kind TEXT,
  file_count INTEGER,
  file_size_bucket TEXT,
  total_size_bucket TEXT,
  output_format TEXT,
  workflow_step TEXT,
  event_source TEXT DEFAULT 'browser',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at ON analytics_events (event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tool_id_created_at ON analytics_events (tool_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_output_format_created_at ON analytics_events (output_format, created_at);
