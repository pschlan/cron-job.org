<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class RecoverPassword extends AbstractAPIMethod {
  static function name() {
    return 'RecoverPassword';
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
    return (
         isset($request->email)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!UserManager::recoverPassword($request->email, $language)) {
        throw new InternalErrorAPIException();
      }
    } catch (EmailAddresInUseException $ex) {
      throw new ConflictAPIException();
    }
    return (object)[];
  }
}
