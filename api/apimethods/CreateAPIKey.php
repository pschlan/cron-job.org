<?php
require_once('lib/APIMethod.php');
require_once('resources/ApiKey.php');

class CreateAPIKey extends AbstractAPIMethod {
  static function name() {
    return 'CreateAPIKey';
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
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new APIKeyManager($sessionToken))
        ->createAPIKey($request->title, isset($request->limitIPs) ? $request->limitIPs : []);

      return (object)[];
    } catch (QuotaExceededException $ex) {
      throw new QuotaExceededAPIException();
    }
  }
}
