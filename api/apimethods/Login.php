<?php
require_once('lib/APIMethod.php');
require_once('lib/Database.php');
require_once('lib/RateLimiter.php');
require_once('lib/SessionToken.php');
require_once('resources/User.php');

class Login extends AbstractAPIMethod {
  private const EMAIL_RATE_LIMIT_ATTEMPTS = 10;
  private const EMAIL_RATE_LIMIT_WINDOW_MINUTES = 15;

  static function name() {
    return 'Login';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(3, 1 * RateLimit::SECOND),
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
    $email = trim($request->email);
    $windowSeconds = self::EMAIL_RATE_LIMIT_WINDOW_MINUTES * RateLimit::MINUTE;
    $emailKey = implode(':', [
      'login',
      'email',
      hash('sha256', strtolower($email)),
      (int)floor(time() / $windowSeconds)
    ]);
    if (!RateLimiter::checkWithKey($emailKey, $windowSeconds + 1, function ($value) {
      return $value < self::EMAIL_RATE_LIMIT_ATTEMPTS;
    })) {
      throw new TooManyRequestsAPIException();
    }

    try {
      $result = UserManager::login($email,
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
