<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class ReenableUserNotifications extends AbstractAPIMethod {
  static function name() {
    return 'ReenableUserNotifications';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, 10 * RateLimit::MINUTE)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    if (!(new UserManager($sessionToken))->reenableNotifications()) {
      throw new InternalErrorAPIException();
    }
    return (object)[];
  }
}
