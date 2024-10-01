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

  public function rateLimits($sessionToken) {
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
    global $config;

    try {
      if (!(new UserManager($sessionToken))->changePassword($request->oldPassword, $request->newPassword)) {
        throw new InternalErrorAPIException();
      }

      $sessionToken->refresh(time() + $config['sessionTokenLifetime'] + 1);
      header('X-Refreshed-Token: ' . $sessionToken->toJwt());

    } catch (WrongPasswordException $ex) {
      throw new ForbiddenAPIException();
    }
    return (object)[];
  }
}
