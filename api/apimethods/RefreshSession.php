<?php
require_once('lib/APIMethod.php');
require_once('lib/Database.php');
require_once('lib/SessionToken.php');

class RefreshSession extends AbstractAPIMethod {
  static function name() {
    return 'RefreshSession';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    return (object)[];
  }
}
