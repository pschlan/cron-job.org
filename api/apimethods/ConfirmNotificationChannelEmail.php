<?php
require_once('lib/APIMethod.php');
require_once('resources/NotificationChannel.php');

class ConfirmNotificationChannelEmail extends AbstractAPIMethod {
  static function name() {
    return 'ConfirmNotificationChannelEmail';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return isset($request->token);
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!NotificationChannelManager::confirmNotificationChannelEmail($request->token)) {
        throw new InternalErrorAPIException();
      }
    } catch (APIException $ex) {
      throw $ex;
    } catch (InvalidJWTTokenException $ex) {
      throw new ForbiddenAPIException();
    } catch (TokenExpiredException $ex) {
      throw new ForbiddenAPIException();
    } catch (InvalidArgumentsException $ex) {
      throw new ForbiddenAPIException();
    } catch (Exception $ex) {
      throw new InternalErrorAPIException();
    }
    return (object)[];
  }
}
