<?php
require_once('lib/APIMethod.php');
require_once('resources/ApiKey.php');

class GetAPIKeys extends AbstractAPIMethod {
  static function name() {
    return 'GetAPIKeys';
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
    $apiKeys = (new APIKeyManager($sessionToken))
      ->getAPIKeys();

    return (object)[
      'apiKeys' => $apiKeys
    ];
  }
}
