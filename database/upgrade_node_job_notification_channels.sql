-- Upgrade existing chronos node databases for per-job notification channel selection.
-- Run once on each node MySQL database before deploying the matching chronos build.
-- Fresh installs already include these columns via struct_node.sql.
--
-- notification_mode: 0=none, 1=all (default), 2=selected
-- selected_notification_channels: comma-separated channel IDs (used when mode=selected)

ALTER TABLE `job`
    ADD COLUMN `notification_mode` tinyint(4) NOT NULL DEFAULT '1' AFTER `notify_ssl_cert_expiry_seconds`,
    ADD COLUMN `selected_notification_channels` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' AFTER `notification_mode`;
