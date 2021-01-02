<?php
require_once('config/config.inc.php');
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class ResetPassword extends AbstractAPIMethod {
  static function name() {
    return 'ResetPassword';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    global $config;
    return (
         isset($request->newPassword)
      && strlen($request->newPassword) >= $config['minPasswordLength']
      && isset($request->token)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!UserManager::resetPassword($request->newPassword, $request->token)) {
        throw new InternalErrorAPIException();
      }
    } catch (TokenExpiredException $ex) {
      throw new ForbiddenAPIException();
    }
    return (object)[];
  }
}
