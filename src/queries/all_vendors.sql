SELECT
  v.id,
  v.name,
  v.category,
  v.phone,
  v.website,
  v.address,
  v.notes,
  v.added_by,
  ROUND(AVG(r.rating), 1) AS avg_rating,
  COUNT(r.id)                       AS review_count
FROM app_vendors__vendors v
LEFT JOIN app_vendors__reviews r
  ON r.vendor_id    = v.id
GROUP BY v.id, v.name, v.category, v.phone, v.website, v.address, v.notes, v.added_by
-- v.name is encrypted at rest and cannot be a tiebreak here (it would sort
-- ciphertext). v.category is in the platform plaintext skip-list, and avg_rating
-- is numeric, so both order correctly.
ORDER BY v.category, (avg_rating IS NULL), avg_rating DESC
LIMIT 500
