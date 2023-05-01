<?php
require_once('lib/APIMethod.php');
require_once('resources/ApiKey.php');

class UpdateAPIKey extends AbstractAPIMethod {
  static function name() {
    return 'UpdateAPIKey';
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
         isset($request->title)
      && (!isset($request->limitIPs) || is_array($request->limitIPs))
      && isset($request->apiKeyId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    (new APIKeyManager($sessionToken))
      ->updateAPIKey($request->apiKeyId,
        $request->title,
        isset($request->limitIPs) ? $request->limitIPs : []);

    return (object)[];
  }
}
