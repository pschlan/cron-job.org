<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class GetUserProfile extends AbstractAPIMethod {
  static function name() {
    return 'GetUserProfile';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    $userManager = new UserManager($sessionToken);

    return (object)[
      'userProfile' => $userManager->getProfile(),
      'userGroup' => $userManager->getGroup()
    ];
  }
}
