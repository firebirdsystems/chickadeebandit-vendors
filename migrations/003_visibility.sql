-- Vendors is a shared community directory: everyone browses all vendors,
-- reviews, and upvote counts, but a member may only write their own rows, and
-- only the creator (or an adult, acting as moderator) may edit/delete. That is
-- the owner_or_visibility policy, which keys on this plaintext visibility column;
-- default 'everyone' so every row is readable household-wide. (The prior
-- owner_only policy was both mis-keyed/dead AND wrong — it would have hidden
-- every member's vendors/reviews from everyone else.)
ALTER TABLE app_vendors__vendors        ADD COLUMN visibility TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE app_vendors__reviews        ADD COLUMN visibility TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE app_vendors__review_upvotes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'everyone';
