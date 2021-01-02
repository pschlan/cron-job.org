<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class UpdateUserProfile extends AbstractAPIMethod {
  static function name() {
    return 'UpdateUserProfile';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
          isset($request->userProfile)
      && is_object($request->userProfile)
      && isset($request->userProfile->firstName)
      && isset($request->userProfile->lastName)
      && isset($request->userProfile->timezone)
      && in_array($request->userProfile->timezone, DateTimeZone::listIdentifiers())
    );
  }

  public function execute($request, $sessionToken, $language) {
    if (!(new UserManager($sessionToken))->updateProfile($request->userProfile)) {
      throw new InternalErrorAPIException();
    }
    return (object)[];
  }
}
