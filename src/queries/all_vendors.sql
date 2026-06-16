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
ORDER BY v.category, avg_rating DESC NULLS LAST, v.name
LIMIT 500
