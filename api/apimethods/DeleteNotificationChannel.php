<?php
require_once('lib/APIMethod.php');
require_once('resources/NotificationChannel.php');

class DeleteNotificationChannel extends AbstractAPIMethod {
  static function name() {
    return 'DeleteNotificationChannel';
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
    return (
         isset($request->channelId)
      && is_numeric($request->channelId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new NotificationChannelManager($sessionToken))
        ->deleteNotificationChannel($request->channelId);

      return (object)[];
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    }
  }
}
