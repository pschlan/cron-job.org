-- Mail phrases for SSL certificate expiry notifications (master database).
-- Run once on the chronos_master database.

REPLACE INTO `phrases`(`lang`, `key`, `value`) VALUES
('en', 'notify.sslcertexpiry.mail.subject', 'SSL certificate expiry warning: $title'),
('en', 'notify.sslcertexpiry.mail.text', 'Hello $firstname $lastname,\n\nthe SSL/TLS certificate for your cronjob "$title" ($url) will expire on $certexpiry (UTC).\n\nPlease renew the certificate in time to avoid service interruptions.\n\nBest Regards\n\nThe cron-job.org team'),
('de', 'notify.sslcertexpiry.mail.subject', 'Warnung: SSL-Zertifikat läuft ab: $title'),
('de', 'notify.sslcertexpiry.mail.text', 'Hallo $firstname $lastname,\n\ndas SSL/TLS-Zertifikat für Ihren Cronjob "$title" ($url) läuft am $certexpiry (UTC) ab.\n\nBitte erneuern Sie das Zertifikat rechtzeitig, um Ausfälle zu vermeiden.\n\nMit freundlichen Grüßen\nIhr cron-job.org-Team');
