<?php
require_once('config/config.inc.php');
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class ChangeUserPassword extends AbstractAPIMethod {
  static function name() {
    return 'ChangeUserPassword';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    global $config;
    return (
         isset($request->oldPassword)
      && isset($request->newPassword)
      && strlen($request->newPassword) >= $config['minPasswordLength']
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!(new UserManager($sessionToken))->changePassword($request->oldPassword, $request->newPassword)) {
        throw new InternalErrorAPIException();
      }
    } catch (WrongPasswordException $ex) {
      throw new ForbiddenAPIException();
    }
    return (object)[];
  }
}
