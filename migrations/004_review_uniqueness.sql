-- Enforce one review per member per vendor at the DB level. The UI assumed this
-- (it edits an existing review rather than adding a second), but without a
-- constraint any member could POST extra INSERTs via /api/db and skew a vendor's
-- average rating. The app now upserts on this key, so re-submitting edits in place.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_reviews_member_vendor
  ON app_vendors__reviews (vendor_id, member_id);
