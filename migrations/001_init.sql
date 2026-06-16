CREATE TABLE IF NOT EXISTS app_vendors__vendors (
  id           TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL,
  phone        TEXT    NOT NULL DEFAULT '',
  website      TEXT    NOT NULL DEFAULT '',
  address      TEXT    NOT NULL DEFAULT '',
  notes        TEXT    NOT NULL DEFAULT '',
  added_by     TEXT    NOT NULL DEFAULT '',
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS app_vendors__reviews (
  id           TEXT    NOT NULL,
  vendor_id    TEXT    NOT NULL,
  member_id    TEXT    NOT NULL,
  rating       INTEGER NOT NULL,
  comment      TEXT    NOT NULL DEFAULT '',
  upvotes      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS app_vendors__review_upvotes (
  review_id    TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  PRIMARY KEY (review_id, member_id)
);
