SELECT
  v.id,
  v.name,
  v.category,
  v.phone,
  v.website,
  v.address,
  v.notes,
  v.added_by,
  ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
  COUNT(r.id)                       AS review_count
FROM vendors v
LEFT JOIN reviews r
  ON r.vendor_id    = v.id
  AND r.household_id = v.household_id
WHERE v.household_id = current_setting('app.household_id', true)::uuid
GROUP BY v.id, v.name, v.category, v.phone, v.website, v.address, v.notes, v.added_by
ORDER BY v.category, avg_rating DESC NULLS LAST, v.name
LIMIT 500
