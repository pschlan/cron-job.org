<?php
require_once('lib/APIMethod.php');
require_once('resources/NotificationChannel.php');

class GetNotificationChannels extends AbstractAPIMethod {
  static function name() {
    return 'GetNotificationChannels';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    $channels = (new NotificationChannelManager($sessionToken))
      ->getNotificationChannels();

    return (object)[
      'notificationChannels' => $channels
    ];
  }
}
