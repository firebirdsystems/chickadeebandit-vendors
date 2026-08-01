import { describe, it, expect } from "vitest";
import { CATEGORIES, avgRating, starsInfo, filterVendors, clampRating, searchableFields } from "../src/logic.js";

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

  it("clamps out-of-range / non-numeric ratings written via raw /api/db", () => {
    // A member could POST arbitrary values bypassing the 1–5 UI. The average
    // must stay bounded and never propagate a value that would crash repeat().
    expect(avgRating([{ rating: 999999999 }])).toBe(5);
    expect(avgRating([{ rating: -4 }])).toBe(0);
    expect(avgRating([{ rating: "abc" }])).toBe(0);
    expect(avgRating([{ rating: 5 }, { rating: 999999999 }])).toBe(5);
  });
});

// ── clampRating ───────────────────────────────────────────────────────────────

describe("clampRating", () => {
  it("passes through valid whole ratings", () => {
    for (const n of [0, 1, 2, 3, 4, 5]) expect(clampRating(n)).toBe(n);
  });

  it("rounds fractional ratings", () => {
    expect(clampRating(3.4)).toBe(3);
    expect(clampRating(3.6)).toBe(4);
  });

  it("clamps out-of-range values so repeat() can never throw", () => {
    expect(clampRating(999999999)).toBe(5);
    expect(clampRating(-100)).toBe(0);
    expect(clampRating(6)).toBe(5);
  });

  it("coerces non-numeric / non-finite values to 0", () => {
    expect(clampRating("abc")).toBe(0);
    expect(clampRating(NaN)).toBe(0);
    expect(clampRating(Infinity)).toBe(0);
    expect(clampRating(null)).toBe(0);
    expect(clampRating(undefined)).toBe(0);
  });

  it("keeps its output a safe argument for String.prototype.repeat", () => {
    for (const bad of [999999999, -100, "x", NaN, Infinity, 2.5]) {
      const n = clampRating(bad);
      expect(() => "★".repeat(n) + "☆".repeat(5 - n)).not.toThrow();
    }
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
    const result = filterVendors(vendors, reviews, "all");
    expect(result.map(v => v.id)).toHaveLength(3);
  });

  it("filters by category", () => {
    const result = filterVendors(vendors, reviews, "Plumber");
    expect(result.every(v => v.category === "Plumber")).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("sorts by average rating descending", () => {
    const result = filterVendors(vendors, reviews, "all");
    expect(result[0].id).toBe("v2"); // rating 5
    expect(result[1].id).toBe("v1"); // rating 4
    expect(result[2].id).toBe("v3"); // rating 3
  });

  it("returns empty array when nothing matches", () => {
    expect(filterVendors(vendors, reviews, "Landscaper")).toHaveLength(0);
  });

  it("does not mutate the input array", () => {
    const copy = [...vendors];
    filterVendors(vendors, reviews, "all");
    expect(vendors).toEqual(copy);
  });
});

// ── searchableFields ──────────────────────────────────────────────────────────

describe("searchableFields", () => {
  it("matches on phone, address and notes, not just the name", () => {
    const fields = searchableFields({
      name: "Sparky Electric", category: "Electrician", phone: "555-0110",
      address: "8 Mill Rd", notes: "did the fusebox in 2024",
    });
    expect(fields).toContain("555-0110");
    expect(fields).toContain("8 Mill Rd");
    expect(fields).toContain("did the fusebox in 2024");
  });
});
