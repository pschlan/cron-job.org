CREATE TABLE `job` (
  `jobid` int(11) NOT NULL AUTO_INCREMENT,
  `userid` int(11) NOT NULL DEFAULT '0',
  `enabled` tinyint(4) NOT NULL DEFAULT '1',
  `title` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `url` varchar(255) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `auth_enable` tinyint(1) NOT NULL DEFAULT '0',
  `auth_user` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `auth_pass` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `notify_failure` tinyint(1) NOT NULL DEFAULT '1',
  `notify_success` tinyint(1) NOT NULL DEFAULT '1',
  `notify_disable` tinyint(1) NOT NULL DEFAULT '1',
  `last_status` tinyint(4) NOT NULL DEFAULT '0',
  `last_fetch` int(11) NOT NULL DEFAULT '0',
  `last_duration` int(11) NOT NULL DEFAULT '0',
  `fail_counter` int(11) NOT NULL DEFAULT '0',
  `save_responses` tinyint(4) NOT NULL DEFAULT '0',
  `request_method` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`),
  KEY `userid` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_body` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `body` text NOT NULL,
  PRIMARY KEY (`jobid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_header` (
  `jobheaderid` int(11) NOT NULL AUTO_INCREMENT,
  `jobid` int(11) NOT NULL DEFAULT '0',
  `key` varchar(64) NOT NULL DEFAULT '',
  `value` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`jobheaderid`),
  KEY `jobid` (`jobid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_hours` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `hour` tinyint(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`,`hour`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_mdays` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `mday` tinyint(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`,`mday`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_minutes` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `minute` tinyint(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`,`minute`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_months` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `month` tinyint(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `job_wdays` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `wday` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`,`wday`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `jobdeletequeue` (
  `jobid` int(11) NOT NULL DEFAULT '0',
  `date` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`jobid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `notification` (
  `notificationid` int(11) NOT NULL AUTO_INCREMENT,
  `jobid` int(11) NOT NULL DEFAULT '0',
  `joblogid` int(11) unsigned NOT NULL DEFAULT '0',
  `date` int(14) NOT NULL DEFAULT '0',
  `date_processed` int(14) NOT NULL DEFAULT '0',
  `type` tinyint(4) NOT NULL DEFAULT '0',
  `status` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`notificationid`),
  KEY `jobid` (`jobid`),
  KEY `joblogid` (`joblogid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `stats` (
  `d` tinyint(4) NOT NULL DEFAULT '0',
  `m` tinyint(4) NOT NULL DEFAULT '0',
  `y` int(11) NOT NULL DEFAULT '0',
  `h` tinyint(4) NOT NULL DEFAULT '0',
  `i` tinyint(4) NOT NULL DEFAULT '0',
  `jobs` int(11) NOT NULL DEFAULT '0',
  `jitter` double NOT NULL DEFAULT '0',
  PRIMARY KEY (`d`,`m`,`y`,`h`,`i`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `user` (
  `userid` int(11) NOT NULL AUTO_INCREMENT,
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
  `timezone` varchar(255) NOT NULL DEFAULT 'Europe/Berlin',
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
