-- Automation support for the `add_vendor` action.
--
-- `source_event_id` records which app event produced the row. The dispatcher's
-- dedupe guard matches on it (SELECT 1 FROM ... WHERE source_event_id = ?
-- LIMIT 1), so a redelivered event reuses the vendor already in the directory
-- instead of listing the same contractor twice.
--
-- Nullable on purpose: vendors added by hand have no source event, and the
-- guard only ever looks for a specific non-null id.
ALTER TABLE app_vendors__vendors ADD COLUMN source_event_id TEXT;

CREATE INDEX IF NOT EXISTS app_vendors__idx_vendors_source_event_id
  ON app_vendors__vendors(source_event_id);
