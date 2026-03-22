-- Tighten rating criteria constraints from 1-5 to 1-3
-- The rating scale for positional criteria is 1 (needs improvement), 2 (developing), 3 (meets expectations)
-- Values of 4 and 5 should never be allowed in the ratings table.

ALTER TABLE ratings DROP CONSTRAINT ratings_rating_1_check;
ALTER TABLE ratings DROP CONSTRAINT ratings_rating_2_check;
ALTER TABLE ratings DROP CONSTRAINT ratings_rating_3_check;
ALTER TABLE ratings DROP CONSTRAINT ratings_rating_4_check;
ALTER TABLE ratings DROP CONSTRAINT ratings_rating_5_check;

ALTER TABLE ratings ADD CONSTRAINT ratings_rating_1_check CHECK (rating_1 >= 1 AND rating_1 <= 3);
ALTER TABLE ratings ADD CONSTRAINT ratings_rating_2_check CHECK (rating_2 >= 1 AND rating_2 <= 3);
ALTER TABLE ratings ADD CONSTRAINT ratings_rating_3_check CHECK (rating_3 >= 1 AND rating_3 <= 3);
ALTER TABLE ratings ADD CONSTRAINT ratings_rating_4_check CHECK (rating_4 >= 1 AND rating_4 <= 3);
ALTER TABLE ratings ADD CONSTRAINT ratings_rating_5_check CHECK (rating_5 >= 1 AND rating_5 <= 3);
