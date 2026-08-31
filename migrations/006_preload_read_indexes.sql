-- Index the manifest `preload` read, which the hub runs server-side while
-- rendering this app's document — on every launch, for every household.
--
-- Both preload reads sorted their whole table under a 500-row cap. Reviews
-- accumulate indefinitely against a vendor list that barely changes.
CREATE INDEX IF NOT EXISTS app_vendors__vendors_created_idx
  ON app_vendors__vendors (created_at DESC);
CREATE INDEX IF NOT EXISTS app_vendors__reviews_created_idx
  ON app_vendors__reviews (created_at ASC);
