-- Upvotes were refactored out of app_vendors__reviews into the dedicated
-- app_vendors__review_upvotes table (see 001_init.sql). D1 does not allow
-- removing a column once created, so the now-unused reviews.upvotes column is
-- left in place (dead, defaults to 0) rather than being removed.
CREATE INDEX IF NOT EXISTS idx_vendors_reviews_vendor_id
  ON app_vendors__reviews (vendor_id);
