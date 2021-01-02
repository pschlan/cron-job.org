<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class ChangeUserEmail extends AbstractAPIMethod {
  const EMAIL_REGEX = '/^[^ ]+@[^ ]+\\.[^ ]+$/';

  static function name() {
    return 'ChangeUserEmail';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->newEmail)
      && preg_match(self::EMAIL_REGEX, $request->newEmail)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!(new UserManager($sessionToken))->changeEmail($request->newEmail, $language)) {
        throw new InternalErrorAPIException();
      }
    } catch (EmailAddresInUseException $ex) {
      throw new ConflictAPIException();
    }
    return (object)[];
  }
}
