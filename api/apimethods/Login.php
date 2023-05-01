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

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, 1 * RateLimit::SECOND),
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
      $result = UserManager::login(trim($request->email),
        $request->password,
        isset($request->rememberMe) && $request->rememberMe,
        $language,
        isset($request->mfaCode) ? $request->mfaCode : false);
      if ($result) {
        return $result;
      }
      throw new UnauthorizedAPIException();
    } catch (UserNotActivatedException $ex) {
      throw new LockedAPIException();
    } catch (UserBannedException $ex) {
      throw new GoneAPIException();
    } catch (RequiresMFAException $ex) {
      throw new ForbiddenAPIException();
    }
  }
}
