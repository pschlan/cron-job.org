<?php
require_once('lib/APIMethod.php');
require_once('lib/Database.php');
require_once('lib/SessionToken.php');
require_once('resources/User.php');

class Login extends AbstractAPIMethod {
  static function name() {
    return 'Login';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND),
      new RateLimit(10, 2 * RateLimit::MINUTE)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->email)
      && isset($request->password)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      $result = UserManager::login($request->email, $request->password, $language);
      if ($result) {
        return $result;
      }
      throw new UnauthorizedAPIException();
    } catch (UserNotActivatedException $ex) {
      throw new ForbiddenAPIException();
    } catch (UserBannedException $ex) {
      throw new GoneAPIException();
    }
  }
}
