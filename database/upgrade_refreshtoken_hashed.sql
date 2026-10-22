-- Upgrade existing chronos master databases to store refresh tokens hashed.
-- Run once on each master MySQL database before deploying API refresh-token hashing.
-- Fresh installs already include this column via struct_master.sql.
-- Existing rows stay token_hashed=0 (plaintext) and migrate on next successful validate.

ALTER TABLE `refreshtoken`
  ADD COLUMN `token_hashed` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `token`;
