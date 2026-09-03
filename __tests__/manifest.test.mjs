import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));

const VALID_STORAGE   = ["kv", "db", "none"];
const VALID_AUDIENCES = ["everyone", "adults", "children"];

describe("manifest.json", () => {
  it("has required string fields", () => {
    for (const field of ["id", "name", "version", "description", "entrypoint", "runtime", "icon"]) {
      expect(manifest[field], `missing field: ${field}`).toBeTruthy();
    }
  });

  it("entrypoint is index.html", () => expect(manifest.entrypoint).toBe("index.html"));
  it("runtime is static",        () => expect(manifest.runtime).toBe("static"));

  it("storage is declared and valid", () => {
    expect(manifest.storage, "storage field is required").toBeTruthy();
    expect(VALID_STORAGE).toContain(manifest.storage);
  });

  it("version follows semver", () => expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/));

  it("permissions.default_audience is valid", () => {
    expect(VALID_AUDIENCES).toContain(manifest.permissions.default_audience);
  });

  it("permissions.requires_approval is boolean", () => {
    expect(typeof manifest.permissions.requires_approval).toBe("boolean");
  });

  it("data_access has reads and writes arrays", () => {
    expect(Array.isArray(manifest.data_access.reads)).toBe(true);
    expect(Array.isArray(manifest.data_access.writes)).toBe(true);
  });
});

// ── ai_access SQL file validation ─────────────────────────────────────────────
if (manifest.ai_access) {
  const ai = manifest.ai_access;

  const SQL_TYPES = [
    { field: "db_exports",   dir: "queries",   keyword: /^(SELECT|WITH)\b/i, label: "SELECT or WITH" },
    { field: "db_mutations", dir: "mutations",  keyword: /^UPDATE\b/i,        label: "UPDATE"         },
    { field: "db_inserts",   dir: "inserts",    keyword: /^INSERT\b/i,        label: "INSERT"         },
    { field: "db_deletes",   dir: "deletes",    keyword: /^DELETE\b/i,        label: "DELETE"         },
  ];

  for (const { field, dir, keyword, label } of SQL_TYPES) {
    const names = ai[field] ?? [];
    if (names.length === 0) continue;

    describe(`ai_access.${field} SQL`, () => {
      it(`each name has a src/${dir}/{name}.sql file`, () => {
        for (const name of names) {
          const path = join(__dirname, `../src/${dir}/${name}.sql`);
          expect(existsSync(path), `missing: src/${dir}/${name}.sql`).toBe(true);
        }
      });

      it(`each SQL file starts with ${label}`, () => {
        for (const name of names) {
          const path = join(__dirname, `../src/${dir}/${name}.sql`);
          if (!existsSync(path)) continue;
          const sql = readFileSync(path, "utf-8").trim();
          expect(keyword.test(sql), `src/${dir}/${name}.sql must start with ${label}, got: ${sql.slice(0, 50)}`).toBe(true);
        }
      });

      it(`each SQL file is a single statement (no semicolons)`, () => {
        for (const name of names) {
          const path = join(__dirname, `../src/${dir}/${name}.sql`);
          if (!existsSync(path)) continue;
          const sql = readFileSync(path, "utf-8");
          expect(sql.includes(";"), `src/${dir}/${name}.sql must not contain semicolons`).toBe(false);
        }
      });
    });
  }

  if (ai.db_inserts?.length) {
    describe("ai_access.db_inserts schemas SQL", () => {
      it("each insert has a src/schemas/{name}.json file", () => {
        for (const name of ai.db_inserts) {
          const path = join(__dirname, `../src/schemas/${name}.json`);
          expect(existsSync(path), `missing: src/schemas/${name}.json`).toBe(true);
        }
      });

      it("each schema file is valid JSON", () => {
        for (const name of ai.db_inserts) {
          const path = join(__dirname, `../src/schemas/${name}.json`);
          if (!existsSync(path)) continue;
          expect(() => JSON.parse(readFileSync(path, "utf-8")), `src/schemas/${name}.json must be valid JSON`).not.toThrow();
        }
      });
    });
  }
}

// Member removal (manifest.member_references). This is a shared directory:
// "the plumber was great" is knowledge the household keeps after its author
// leaves, and visibility = 'everyone' keeps such a review readable while
// owner_or_visibility still lets an adult moderate it — so the review and its
// author id stay. Upvotes are a live tally rather than content, so a departed
// member's vote is removed; the table is keyed (review_id, member_id) with no
// `id` column, hence rowid.
describe("member_references", () => {
  it("keeps reviews as household knowledge and drops their upvotes", () => {
    expect(manifest.member_references).toEqual({
      vendors: { column: "added_by", on_removed: "keep" },
      reviews: { column: "member_id", on_removed: "keep" },
      review_upvotes: { column: "member_id", on_removed: "delete", id_column: "rowid" },
    });
  });
});

// ── write_effects ────────────────────────────────────────────────────────────
// `reviews.upvotes` is maintained by hub-appended effect SQL on
// `review_upvotes`. Three things about that pairing fail LATE and quietly if
// they drift, so they are pinned here rather than discovered at publish or in
// production:
//
//  1. an effect may not assign a derived value to an encrypted column, so the
//     computed column must be in db_plaintext_columns (admission refuses the
//     app otherwise — a failed release, not a failed test);
//  2. the effect is only half the mechanism: without `writable_by: []` on
//     `upvotes`, any member could still forge a total by hand;
//  3. declaring insert effects CONSTRAINS this app's own client SQL from that
//     release on — every INSERT into `review_upvotes` must be single-row VALUES
//     with named columns, no upsert, and must name `review_id`. Admission
//     cannot see the bundle's SQL, so nothing warns at publish: a drifted
//     INSERT starts 400ing the moment the release installs.
describe("write_effects", () => {
  const effects = manifest.write_effects ?? {};
  const source = readFileSync(join(__dirname, "../src/index.html"), "utf-8");
  const prefix = `app_${manifest.id.replace(/-/g, "_")}__`;

  it("declares the upvote counter effect on both verbs", () => {
    expect(Object.keys(effects)).toEqual(["review_upvotes"]);
    // The delete verb is what keeps the total honest when rows are removed by
    // a lane other than a fresh vote — above all member_references cleanup,
    // which deletes a departing member's votes and, before the hub fired
    // effects there, left every review they had upvoted permanently inflated
    // (and mis-ranked, since "top" sorts on this column).
    expect(Object.keys(effects.review_upvotes).sort()).toEqual(["delete", "insert"]);
  });

  // The counterpart the delete verb imposes on this app's own SQL: a batch may
  // not carry two DELETEs on one effect-bearing table, because the second's key
  // capture runs after the first has removed its rows. confirmDeleteVendor
  // chunks its upvote deletes, so all but the last must leave the batch.
  it("never batches two DELETEs on the trigger table", () => {
    const teardown = source.slice(source.indexOf("window.confirmDeleteVendor"));
    const body = teardown.slice(0, teardown.indexOf("\n};"));
    expect(body).toContain("const last = upvoteDeletes.pop();");
    expect(body).toMatch(/for \(const statement of upvoteDeletes\) await dbBatch\(\[statement\]\)/);
    // The last chunk still rides with the pair that must not split.
    expect(body).toContain("dbBatch(last ? [last, ...tail] : tail)");
    expect(body).not.toMatch(/dbBatch\(\[\.\.\.upvoteDeletes/);
  });

  it("computes only a plaintext column, locked against every client", () => {
    for (const effect of effects.review_upvotes.insert) {
      const [, target, column] = effect.statement.match(/^UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=/) ?? [];
      expect(target, `${effect.label} target`).toBeTruthy();
      expect(manifest.db_plaintext_columns ?? [], `${column} is effect-computed`).toContain(column);
      const acl = manifest.row_policies[target.slice(prefix.length)]?.column_write_acls?.[column];
      expect(acl?.writable_by, `${column} must be client-immutable`).toEqual([]);
      // A lock limited to `actions: ["update"]` would still let an INSERT set
      // the column; no INSERT here names it, so both actions.
      expect(acl.actions, `${column} lock covers insert and update`).toBeUndefined();
      // Recompute, never accumulate — that is what self-heals the lanes that
      // delete vote rows without firing effects (member_references removal).
      expect(effect.statement).toMatch(/=\s*\(SELECT\s+COUNT\(\*\)/i);
    }
  });

  it("never writes the effect-maintained column from client SQL", () => {
    expect(source.includes("SET upvotes")).toBe(false);
  });

  it("keeps every client INSERT into the trigger table in the shape effects require", () => {
    const needed = effects.review_upvotes.insert.flatMap((e) =>
      [...e.statement.matchAll(/:new\.(\w+)/g)].map((m) => m[1]));
    const inserts = [...source.matchAll(
      new RegExp(`INSERT(\\s+OR\\s+\\w+)?\\s+INTO\\s+${prefix}review_upvotes\\s*\\(([^)]*)\\)([\\s\\S]{0,300})`, "g"),
    )];
    expect(inserts.length, "no client INSERT into review_upvotes found — the scan drifted").toBeGreaterThan(0);
    for (const [, orClause, columns, tail] of inserts) {
      expect(orClause, "INSERT OR … is refused on an effect table").toBeUndefined();
      const named = columns.split(",").map((c) => c.trim());
      for (const column of needed) expect(named, `INSERT must name ${column}`).toContain(column);
      const values = tail.slice(0, tail.indexOf(";") === -1 ? tail.length : tail.indexOf(";"));
      expect(/ON\s+CONFLICT/i.test(values), "INSERT may not upsert").toBe(false);
      expect(values.match(/VALUES\s*\((?:\s*\?\s*,)*\s*\?\s*\)/i), "must be single-row VALUES of ? params").toBeTruthy();
    }
  });
});
