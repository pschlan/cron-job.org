<?php
require_once('lib/APIMethod.php');

class GetTimezones extends AbstractAPIMethod {
  static function name() {
    return 'GetTimezones';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    return (object)[
      'timezones' => DateTimeZone::listIdentifiers()
    ];
  }
}
