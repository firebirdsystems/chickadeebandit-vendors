import { describe, it, expect } from "vitest";
import { CATEGORIES, avgRating, starsInfo, filterVendors } from "../src/logic.js";

// ── CATEGORIES ────────────────────────────────────────────────────────────────

describe("CATEGORIES", () => {
  it("is a non-empty array of strings", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    for (const c of CATEGORIES) expect(typeof c).toBe("string");
  });

  it("includes common vendor types", () => {
    expect(CATEGORIES).toContain("Plumber");
    expect(CATEGORIES).toContain("Electrician");
    expect(CATEGORIES).toContain("Other");
  });
});

// ── avgRating ─────────────────────────────────────────────────────────────────

describe("avgRating", () => {
  it("returns null for an empty reviews array", () => {
    expect(avgRating([])).toBeNull();
  });

  it("returns the average of ratings", () => {
    expect(avgRating([{ rating: 4 }, { rating: 2 }])).toBe(3);
    expect(avgRating([{ rating: 5 }])).toBe(5);
  });

  it("handles a single review", () => {
    expect(avgRating([{ rating: 3 }])).toBe(3);
  });
});

// ── starsInfo ─────────────────────────────────────────────────────────────────

describe("starsInfo", () => {
  it("returns noRating=true for null", () => {
    expect(starsInfo(null).noRating).toBe(true);
  });

  it("returns correct full/empty counts", () => {
    expect(starsInfo(5)).toEqual({ full: 5, empty: 0, noRating: false });
    expect(starsInfo(3)).toEqual({ full: 3, empty: 2, noRating: false });
    expect(starsInfo(0)).toEqual({ full: 0, empty: 5, noRating: false });
  });

  it("rounds fractional ratings", () => {
    expect(starsInfo(3.4)).toEqual({ full: 3, empty: 2, noRating: false });
    expect(starsInfo(3.6)).toEqual({ full: 4, empty: 1, noRating: false });
  });
});

// ── filterVendors ─────────────────────────────────────────────────────────────

function vendor(overrides = {}) {
  return { id: "v1", name: "Bob's Plumbing", category: "Plumber", address: "123 Main St", notes: "", created_at: "2025-01-01", ...overrides };
}

describe("filterVendors", () => {
  const vendors = [
    vendor({ id: "v1", category: "Plumber", name: "Bob's Plumbing" }),
    vendor({ id: "v2", category: "Electrician", name: "Sparky Electric" }),
    vendor({ id: "v3", category: "Plumber", name: "Ace Plumbers" }),
  ];
  const reviews = [
    { vendor_id: "v1", rating: 4 },
    { vendor_id: "v2", rating: 5 },
    { vendor_id: "v3", rating: 3 },
  ];

  it("returns all vendors when category is 'all'", () => {
    const result = filterVendors(vendors, reviews, "all", "");
    expect(result.map(v => v.id)).toHaveLength(3);
  });

  it("filters by category", () => {
    const result = filterVendors(vendors, reviews, "Plumber", "");
    expect(result.every(v => v.category === "Plumber")).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("filters by search query on name", () => {
    const result = filterVendors(vendors, reviews, "all", "sparky");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("v2");
  });

  it("sorts by average rating descending", () => {
    const result = filterVendors(vendors, reviews, "all", "");
    expect(result[0].id).toBe("v2"); // rating 5
    expect(result[1].id).toBe("v1"); // rating 4
    expect(result[2].id).toBe("v3"); // rating 3
  });

  it("returns empty array when nothing matches", () => {
    expect(filterVendors(vendors, reviews, "Landscaper", "")).toHaveLength(0);
  });

  it("does not mutate the input array", () => {
    const copy = [...vendors];
    filterVendors(vendors, reviews, "all", "");
    expect(vendors).toEqual(copy);
  });
});
