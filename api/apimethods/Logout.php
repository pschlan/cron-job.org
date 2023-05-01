<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class Logout extends AbstractAPIMethod {
  static function name() {
    return 'Logout';
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
    (new UserManager($sessionToken))->logout();
    return (object)[];
  }
}
