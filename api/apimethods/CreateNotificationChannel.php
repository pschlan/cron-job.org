<?php
require_once('lib/APIMethod.php');
require_once('resources/NotificationChannel.php');

class CreateNotificationChannel extends AbstractAPIMethod {
  static function name() {
    return 'CreateNotificationChannel';
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
         isset($request->type)
      && is_numeric($request->type)
      && isset($request->destination)
      && is_string($request->destination)
      && (!isset($request->payload) || is_string($request->payload))
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new NotificationChannelManager($sessionToken))
        ->createNotificationChannel(
          $request->type,
          $request->destination,
          !isset($request->enabled) || $request->enabled,
          isset($request->payload) ? $request->payload : ''
        );

      return (object)[];
    } catch (QuotaExceededException $ex) {
      throw new QuotaExceededAPIException();
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    }
  }
}
