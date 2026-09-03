-- Bring the dead `reviews.upvotes` column (left behind by 002_upvotes_refactor)
-- back into service, now maintained by `manifest.write_effects` on
-- `review_upvotes` — the un-revert of the denormalized total.
--
-- The original attempt failed because upvoting is by definition someone ELSE's
-- review while `reviews` is owner_or_visibility: a non-supervisor's bump got
-- `AND member_id = <caller>` appended, matched no row, and the badge never
-- moved while the vote row landed. An effect statement runs with hub authority
-- and bypasses row-policy SCOPING, so the recompute lands on any review; the
-- column is `writable_by: []` in row_policies.reviews.column_write_acls, so no
-- client can forge a total either way. `upvotes` is in db_plaintext_columns:
-- it holds a derived integer, and an effect may not assign a derived value to
-- an encrypted column.
--
-- INSERT effect only, deliberately. An upvote is never retracted in this app
-- (the button disables once cast); the only deletions of upvote rows are the
-- cascades that remove the review or vendor outright, where a count on a
-- deleted row is not observable. The one lane that would drift is
-- member_references.review_upvotes on_removed "delete" — removing a member
-- drops their votes through a hub lane that fires no effects, so a review can
-- read high until its next upvote. Recompute (rather than `upvotes + 1`) is
-- what makes that self-heal on the next vote instead of compounding.
--
-- Declaring the effect is not retroactive, so the backfill below is a copy of
-- the effect statement over every existing review. It is served by
-- review_upvotes' PRIMARY KEY (review_id, member_id) on its leftmost prefix.

UPDATE app_vendors__reviews SET
  upvotes = (SELECT COUNT(*) FROM app_vendors__review_upvotes u WHERE u.review_id = app_vendors__reviews.id);
