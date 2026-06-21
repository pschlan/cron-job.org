-- Shared notification email wrapper template (master database).
-- Run once on the chronos_master database.
--
-- The wrapper template is language-independent and therefore stored under the
-- sentinel language '*'. Both the PHP API (api/lib/Mail.php) and chronos
-- (chronos/NotificationThread.cpp) read these rows directly (no localized
-- fallback) and fill the slots ($.subject, $.body, $projectName, $logoURL,
-- $year, $unsubscribeFooter) at send time.
--
-- This file is the canonical, editable source of the wrapper. The previous
-- api/config/EmailTemplate.{html,txt} files are no longer read at runtime.

REPLACE INTO `phrases`(`lang`, `key`, `value`) VALUES
('*', 'mail.template.html', '<!DOCTYPE html>
<html>
  <head>
    <title>$.subject - $projectName</title>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <meta content="width=device-width" name="viewport">

  <style>body {
font-family: "Roboto", "Helvetica", "Arial", sans-serif; background-color: #f0f0f0; padding: 0; margin: 0;
}
a:hover {
text-decoration: underline;
}
</style>
</head>
  <body style=''font-family: "Roboto", "Helvetica", "Arial", sans-serif; margin: 0; padding: 0;'' bgcolor="#f0f0f0">
    <div id="container" style="padding: 20px;">
      <table id="layout" style="max-width: 600px; border-collapse: collapse; margin: 0 auto;">
        <tr>
          <td id="head" style="padding: 30px 20px;" align="center" bgcolor="#fff"><img src="$logoURL" id="logo" style="width: 293px; height: 65px;"></td>
        </tr>
        <tr>
          <td id="body" style="padding: 30px 20px;" bgcolor="#fff">
            <h1 style="font-size: 125%;">$.subject</h1>
            $.body
          </td>
        </tr>
        <tr>
          <td id="footer" style="color: #333; font-size: 75%; padding: 30px 20px;">
            $unsubscribeFooter
            <p>
              © $year $projectName
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
'),
('*', 'mail.template.text', '***********
$.subject
***********

$.body

$unsubscribeFooter

© $year $projectName
');

REPLACE INTO `phrases`(`lang`, `key`, `value`) VALUES
('en', 'notify.mail.footer', 'You are receiving this email because you enabled notifications for one of your cron jobs. You can change your notification settings anytime in your account.'),
('de', 'notify.mail.footer', 'Sie erhalten diese E-Mail, weil Sie Benachrichtigungen für einen Ihrer Cronjobs aktiviert haben. Sie können Ihre Benachrichtigungseinstellungen jederzeit in Ihrem Account ändern.');
