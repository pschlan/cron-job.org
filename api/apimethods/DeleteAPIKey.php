<?php
require_once('lib/APIMethod.php');
require_once('resources/ApiKey.php');

class DeleteAPIKey extends AbstractAPIMethod {
  static function name() {
    return 'DeleteAPIKey';
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
         isset($request->apiKeyId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    (new APIKeyManager($sessionToken))
      ->deleteAPIKey($request->apiKeyId);

    return (object)[];
  }
}
