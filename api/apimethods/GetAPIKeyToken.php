<?php
require_once('lib/APIMethod.php');
require_once('resources/ApiKey.php');
require_once('resources/User.php');

class GetAPIKeyToken extends AbstractAPIMethod {
  static function name() {
    return 'GetAPIKeyToken';
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
      && isset($request->password)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new UserManager($sessionToken))->verifyPassword($request->password);

      $apiKey = (new APIKeyManager($sessionToken))
        ->getAPIKey($request->apiKeyId);

      if (!$apiKey) {
        throw new NotFoundAPIException();
      }

      return (object)[
        'apiKeyToken' => $apiKey->getApiKey()
      ];
    } catch (WrongPasswordException $ex) {
      throw new ForbiddenAPIException();
    }
  }
}
