-- Constrain ratings.stars to the canonical 1..5 range at the DB layer.
-- Application code (Zod schema for ratings) already validates this; the
-- CHECK constraint is the belt-and-braces backstop.

ALTER TABLE "ratings"
  ADD CONSTRAINT "rating_stars_range" CHECK ("stars" >= 1 AND "stars" <= 5);
