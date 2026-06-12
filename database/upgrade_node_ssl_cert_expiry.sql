-- Upgrade existing chronos node databases for SSL certificate expiry support.
-- Run once on each node MySQL database before deploying the ssl_expiry chronos build.
-- Fresh installs already include these columns via struct_node.sql.

ALTER TABLE `job`
    ADD COLUMN `ssl_cert_expiry` int(11) NOT NULL DEFAULT '0' AFTER `last_duration`,
    ADD COLUMN `ssl_cert_expiry_notified` int(11) NOT NULL DEFAULT '0' AFTER `ssl_cert_expiry`,
    ADD COLUMN `notify_ssl_cert_expiry` tinyint(1) NOT NULL DEFAULT '0' AFTER `notify_disable`,
    ADD COLUMN `notify_ssl_cert_expiry_seconds` int(11) NOT NULL DEFAULT '604800' AFTER `notify_ssl_cert_expiry`;
