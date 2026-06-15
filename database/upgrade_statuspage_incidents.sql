-- Upgrade existing chronos master databases for status page manual incidents.
-- Run once on each master MySQL database before deploying the status page incidents build.
-- Fresh installs already include this table via struct_master.sql.

CREATE TABLE `statuspageincident` (
  `statuspageincidentid` int(11) NOT NULL AUTO_INCREMENT,
  `statuspageid` int(11) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL DEFAULT '',
  `description` text NOT NULL,
  `start_date` int(11) NOT NULL DEFAULT '0',
  `status` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`statuspageincidentid`),
  KEY `statuspageid` (`statuspageid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
