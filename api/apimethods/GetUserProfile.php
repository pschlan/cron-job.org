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

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    $userManager = new UserManager($sessionToken);

    $userGroup = $userManager->getGroup();
    $userSubscription = $userManager->getSubscription();

    return (object)[
      'userProfile' => $userManager->getProfile(),
      'userGroup' => $userGroup,
      'userSubscription' => $userSubscription
    ];
  }
}
