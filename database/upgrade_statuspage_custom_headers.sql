-- Upgrade existing chronos master databases for status page custom head HTML.
-- Run once on each master MySQL database before deploying the custom headers build.
-- Fresh installs already include this column via struct_master.sql.

ALTER TABLE `statuspage`
  ADD COLUMN `custom_headers` varchar(1000) NOT NULL DEFAULT '' AFTER `uniqueid`;
