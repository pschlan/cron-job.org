<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class GetStatusPages extends AbstractAPIMethod {
  static function name() {
    return 'GetStatusPages';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    global $config;
    if ($config['statusPageDomain'] === null) {
      return false;
    }
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    return (new StatusPageManager($sessionToken))->getStatusPages();
  }
}
