/**
 * Pure business logic for the Vendors app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

export const CATEGORIES = ["Contractor", "Handyman", "HVAC", "Landscaper", "Painter", "Plumber", "Electrician", "Septic", "Trash", "Service", "Other"];

// Ratings are stored as INTEGER, but SQLite type affinity is not enforcement:
// any member can write an out-of-range or non-numeric `rating` via raw /api/db.
// Turning such a value into stars with String.prototype.repeat() would throw a
// RangeError (negative / > 2^28) and crash the render for everyone. Clamp every
// rating to a whole 0–5 before it reaches repeat() or an average.
export function clampRating(rating) {
  const n = Math.round(Number(rating));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

export function avgRating(reviews) {
  if (!reviews.length) return null;
  return reviews.reduce((s, r) => s + clampRating(r.rating), 0) / reviews.length;
}

export function starsInfo(rating) {
  if (rating === null) return { full: 0, empty: 5, noRating: true };
  const full  = clampRating(rating);
  const empty = 5 - full;
  return { full, empty, noRating: false };
}

export function filterVendors(vendors, reviews, activeCategory, searchQuery) {
  return vendors.filter(v => {
    const matchesCat = activeCategory === "all" || v.category === activeCategory;
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch = !q ||
      (v.name || "").toLowerCase().includes(q) ||
      (v.category || "").toLowerCase().includes(q) ||
      (v.address || "").toLowerCase().includes(q) ||
      (v.notes || "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    const ra = avgRating(reviews.filter(r => r.vendor_id === a.id)) ?? -1;
    const rb = avgRating(reviews.filter(r => r.vendor_id === b.id)) ?? -1;
    return rb - ra || new Date(b.created_at) - new Date(a.created_at);
  });
}
