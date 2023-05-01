<?php
require_once('lib/APIMethod.php');
require_once('lib/Database.php');
require_once('lib/SessionToken.php');
require_once('resources/User.php');

class ResendActivationEmail extends AbstractAPIMethod {
  static function name() {
    return 'ResendActivationEmail';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, 1 * RateLimit::MINUTE),
      new RateLimit(5, 1 * RateLimit::HOUR)
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
      $result = UserManager::resendActivationEmail(trim($request->email), $request->password);
      if ($result) {
        return (object) [];
      }
      throw new BadRequestAPIException();
    } catch (AccountNotFoundException $ex) {
      throw new NotFoundAPIException();
    } catch (WrongPasswordException $ex) {
      throw new ForbiddenAPIException();
    }
  }
}
