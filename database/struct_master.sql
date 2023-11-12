CREATE TABLE `nodestats`(
  `nodeid` int(11) NOT NULL,
  `d` tinyint(4) NOT NULL DEFAULT '0',
  `m` tinyint(4) NOT NULL DEFAULT '0',
  `y` int(11) NOT NULL DEFAULT '0',
  `h` tinyint(4) NOT NULL DEFAULT '0',
  `i` tinyint(4) NOT NULL DEFAULT '0',
  `jobs` int(11) NOT NULL DEFAULT '0',
  `jitter` double NOT NULL DEFAULT '0',
  PRIMARY KEY (`nodeid`,`d`,`m`,`y`,`h`,`i`),
  KEY `idx_dmy` (`d`, `m`, `y`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `user` (
  `userid` int(11) NOT NULL AUTO_INCREMENT,
  `usergroupid` int(11) NOT NULL DEFAULT 1,
  `status` tinyint(4) NOT NULL DEFAULT '0',
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `password` varchar(40) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `password_salt` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `firstname` varchar(64) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `lastname` varchar(64) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `signup_ip` varchar(48) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `signup_date` int(11) NOT NULL DEFAULT '0',
  `verification_token` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `verification_date` int(11) NOT NULL DEFAULT '0',
  `lastlogin_ip` varchar(48) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `lastlogin_date` int(11) NOT NULL DEFAULT '0',
  `lastlogin_lang` varchar(4) NOT NULL DEFAULT 'de',
  `timezone` varchar(32) NOT NULL DEFAULT 'Europe/Berlin',
  `newsletter_subscribe` enum('yes', 'no', 'undefined') NOT NULL DEFAULT 'undefined',
  `notifications_auto_disabled` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`userid`),
  KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `user_pwreset` (
  `userid` int(11) NOT NULL DEFAULT '0',
  `expires` int(11) NOT NULL DEFAULT '0',
  `token` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `password` varchar(40) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `password_salt` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`userid`),
  KEY `expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `usergroup`(
    `usergroupid` int(11) NOT NULL AUTO_INCREMENT,
    `title` varchar(128) NOT NULL DEFAULT '',
    `max_status_pages` int(11) NOT NULL DEFAULT '5',
    `max_status_page_monitors` int(11) NOT NULL DEFAULT '10',
    `max_status_page_domains` int(11) NOT NULL DEFAULT '2',
    `request_timeout` int(11) NOT NULL DEFAULT '30',
    `request_max_size` int(11) NOT NULL DEFAULT '8192',
    `max_failures` int(11) NOT NULL DEFAULT 15,
    `execution_priority` tinyint(4) NOT NULL DEFAULT 0,
    `api_requests_per_day` int(11) NOT NULL DEFAULT '100',
    `max_api_keys` int(11) NOT NULL DEFAULT '1',
    PRIMARY KEY(`usergroupid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
INSERT INTO `usergroup`(`usergroupid`, `title`) VALUES(1, 'Default');

CREATE TABLE `node`(
    `nodeid` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(128) NOT NULL DEFAULT '',
    `ip` varchar(32) NOT NULL DEFAULT '',
    `public_ip` varchar(32) NOT NULL DEFAULT '',
    `port` int(11) NOT NULL DEFAULT 9090,
    `enabled` tinyint(4) NOT NULL DEFAULT '1',
    `load_24h` tinyint(255) NOT NULL DEFAULT '0',
    PRIMARY KEY(`nodeid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
INSERT INTO `node`(`nodeid`,`name`,`ip`,`port`) VALUES(1, 'Local Node', '127.0.0.1',9090);

CREATE TABLE `usergroupnode`(
    `usergroupid` int(11) NOT NULL,
    `nodeid` int(11) NOT NULL,
    `enabled` tinyint(4) NOT NULL DEFAULT '1',
    PRIMARY KEY(`usergroupid`, `nodeid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
INSERT INTO `usergroupnode`(`usergroupid`,`nodeid`,`enabled`) VALUES(1, 1, 1);

CREATE TABLE `job`(
    `jobid` int(11) NOT NULL AUTO_INCREMENT,
    `userid` int(11) NOT NULL DEFAULT 0,
    `nodeid` int(11) NOT NULL DEFAULT 0,
    PRIMARY KEY(`jobid`),
    KEY(`userid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `phrases`(
    `lang` varchar(4) NOT NULL DEFAULT 'de',
    `key` varchar(64) NOT NULL DEFAULT '',
    `value` TEXT NOT NULL,
    PRIMARY KEY(`lang`,`key`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `userdeletelog` (
    `userid` int(11) NOT NULL DEFAULT '0',
    `date` int(14) NOT NULL DEFAULT '0',
    `source` enum('api','ops','unknown') NOT NULL DEFAULT 'unknown',
    `date_finished` int(14) NOT NULL DEFAULT '0',
    `email` varchar(40) NOT NULL DEFAULT '',
    `email_salt` varchar(16) NOT NULL DEFAULT '',
    PRIMARY KEY (`userid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `refreshtoken`(
    `token` varchar(64) NOT NULL DEFAULT '',
    `userid` int(11) NOT NULL DEFAULT 0,
    `device` varchar(255) NOT NULL DEFAULT '',
    `expires` int(11) NOT NULL DEFAULT 0,
    PRIMARY KEY(`token`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `usergroupchange`(
    `usergroupchangeid` int(11) NOT NULL AUTO_INCREMENT,
    `userid` int(11) NOT NULL DEFAULT 0,
    `oldusergroupid` int(11) NOT NULL DEFAULT 0,
    `newusergroupid` int(11) NOT NULL DEFAULT 0,
    `created` int(11) NOT NULL DEFAULT 0,
    `processed` int(11) NOT NULL DEFAULT 0,
    PRIMARY KEY(`usergroupchangeid`),
    KEY(`processed`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

DELIMITER $$
CREATE TRIGGER `track_usergroupchange`
AFTER UPDATE ON `user` FOR EACH ROW
BEGIN
    IF NEW.`usergroupid` <> OLD.`usergroupid` THEN
        INSERT INTO `usergroupchange`(`userid`,`oldusergroupid`,`newusergroupid`,`created`) VALUES(NEW.`userid`,OLD.`usergroupid`,NEW.`usergroupid`,UNIX_TIMESTAMP());
    END IF;
END;
$$
DELIMITER ;

CREATE TABLE `apikey` (
  `apikeyid` int(11) NOT NULL AUTO_INCREMENT,
  `apikey` varchar(255) NOT NULL DEFAULT '',
  `userid` int(11) NOT NULL DEFAULT '0',
  `enabled` tinyint(4) NOT NULL DEFAULT '0',
  `created` int(14) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL DEFAULT '',
  `limit_ips` text NOT NULL,
  PRIMARY KEY (`apikeyid`),
  UNIQUE KEY `apikey` (`apikey`),
  KEY `userid` (`userid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `apilog` (
  `apilogid` int(11) NOT NULL AUTO_INCREMENT,
  `apikeyid` int(11) NOT NULL DEFAULT '0',
  `userid` int(11) NOT NULL DEFAULT '0',
  `ip` varchar(128) NOT NULL DEFAULT '',
  `method` varchar(128) NOT NULL DEFAULT '',
  `date` int(14) NOT NULL,
  PRIMARY KEY (`apilogid`),
  KEY `apikeyid` (`apikeyid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `mfadevice` (
  `mfadeviceid` int(11) NOT NULL AUTO_INCREMENT,
  `userid` int(11) NOT NULL DEFAULT '0',
  `enabled` tinyint(4) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL DEFAULT '',
  `secret` varchar(255) NOT NULL DEFAULT '',
  `type` tinyint(4) NOT NULL DEFAULT '0',
  `created` int(14) NOT NULL DEFAULT '0',
  `last_timeslot` int(14) NOT NULL DEFAULT '0',
  PRIMARY KEY (`mfadeviceid`),
  KEY `userid` (`userid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `statuspage` (
  `statuspageid` int(11) NOT NULL AUTO_INCREMENT,
  `userid` int(11) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL DEFAULT '',
  `enabled` tinyint(4) NOT NULL DEFAULT '1',
  `uniqueid` varchar(8) NOT NULL DEFAULT '',
  PRIMARY KEY (`statuspageid`),
  UNIQUE KEY `uniqueid` (`uniqueid`),
  KEY `userid` (`userid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `statuspagedomain` (
  `domain` varchar(255) NOT NULL DEFAULT '',
  `statuspageid` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`domain`),
  KEY `statuspageid` (`statuspageid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `statuspagejob` (
  `statuspagejobid` int(11) NOT NULL AUTO_INCREMENT,
  `statuspageid` int(11) NOT NULL DEFAULT '0',
  `position` tinyint(4) NOT NULL DEFAULT '0',
  `jobid` int(11) NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL DEFAULT '',
  `enabled` tinyint(4) NOT NULL DEFAULT '1',
  `threshold_uptime_warning` double NOT NULL DEFAULT '0.9',
  `threshold_uptime_error` double NOT NULL DEFAULT '0.5',
  `threshold_latency_warning` int(11) NOT NULL DEFAULT '2000',
  `threshold_latency_error` int(11) NOT NULL DEFAULT '20000',
  `percentile` double NOT NULL DEFAULT '0.9',
  PRIMARY KEY (`statuspagejobid`),
  KEY `statuspageid` (`statuspageid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `statuspagelogo` (
  `statuspageid` int(11) NOT NULL DEFAULT '0',
  `logo` mediumblob NOT NULL,
  `mimetype` varchar(128) NOT NULL DEFAULT '',
  PRIMARY KEY (`statuspageid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `user_stripe_mapping` (
  `userid` int(11) NOT NULL DEFAULT '0',
  `stripe_customer_id` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`userid`),
  UNIQUE KEY `stripe_customer_id` (`stripe_customer_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `user_subscription` (
  `userid` int(11) NOT NULL DEFAULT '0',
  `product_id` varchar(64) NOT NULL DEFAULT '',
  `subscription_id` varchar(255) NOT NULL DEFAULT '',
  `current_period_start` int(11) NOT NULL DEFAULT '0',
  `current_period_end` int(11) NOT NULL DEFAULT '0',
  `cancel_at` int(11) NOT NULL DEFAULT '0',
  `status` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`userid`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `folder` (
  `folderid` int(11) NOT NULL AUTO_INCREMENT,
  `userid` int(11) NOT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`folderid`),
  KEY `userid` (`userid`),
  UNIQUE KEY `user_folder_title` (`userid`, `title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
