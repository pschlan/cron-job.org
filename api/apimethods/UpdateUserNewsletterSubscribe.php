<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class UpdateUserNewsletterSubscribe extends AbstractAPIMethod {
  static function name() {
    return 'UpdateUserNewsletterSubscribe';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->subscribe)
      && in_array($request->subscribe, ['yes', 'no', 'undefined'])
    );
  }

  public function execute($request, $sessionToken, $language) {
    if (!(new UserManager($sessionToken))->updateNewsletterSubscribe($request->subscribe)) {
      throw new InternalErrorAPIException();
    }
    return (object)[];
  }
}
