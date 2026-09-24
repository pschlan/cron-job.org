<?php
require_once('lib/APIMethod.php');
require_once('resources/NotificationChannel.php');

class SetNotificationChannelEnabled extends AbstractAPIMethod {
  static function name() {
    return 'SetNotificationChannelEnabled';
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
      && isset($request->enabled)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new NotificationChannelManager($sessionToken))
        ->setNotificationChannelEnabled($request->channelId, $request->enabled);

      return (object)[];
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    }
  }
}
