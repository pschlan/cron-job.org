<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class UpdateUserLanguage extends AbstractAPIMethod {
  static function name() {
    return 'UpdateUserLanguage';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(2, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
      isset($request->language)
    );
  }

  public function execute($request, $sessionToken, $language) {
    if (!(new UserManager($sessionToken))->updateLanguage($request->language)) {
      throw new InternalErrorAPIException();
    }
    return (object)[];
  }
}
