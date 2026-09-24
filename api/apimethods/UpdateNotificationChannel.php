<?php
require_once('lib/APIMethod.php');
require_once('resources/NotificationChannel.php');

class UpdateNotificationChannel extends AbstractAPIMethod {
  static function name() {
    return 'UpdateNotificationChannel';
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
      && isset($request->destination)
      && is_string($request->destination)
      && isset($request->enabled)
      && (!isset($request->payload) || is_string($request->payload))
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new NotificationChannelManager($sessionToken))
        ->updateNotificationChannel(
          $request->channelId,
          $request->destination,
          $request->enabled,
          isset($request->payload) ? $request->payload : ''
        );

      return (object)[];
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    }
  }
}
