<?php
require_once('config/config.inc.php');
require_once('lib/APIMethod.php');
require_once('lib/RecaptchaVerifier.php');
require_once('resources/User.php');

class CreateAccount extends AbstractAPIMethod {
  static function name() {
    return 'CreateAccount';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
          isset($request->token)
      &&  isset($request->firstName)
      &&  isset($request->lastName)
      &&  isset($request->email)
      &&  isset($request->password)
      &&  isset($request->timezone)
    );
  }

  public function execute($request, $sessionToken, $language) {
    global $config;

    if (!RecaptchaVerifier::verify($config['recaptchaSecretKey'], $request->token)) {
      throw new ForbiddenAPIException();
    }

    if (in_array($request->timezone, DateTimeZone::listIdentifiers())) {
      $timezone = $request->timezone;
    } else {
      $timezone = 'UTC';
    }

    try {
      if (!UserManager::createAccount(
            $request->email,
            $request->firstName,
            $request->lastName,
            $request->password,
            $language,
            $timezone)) {
        throw new InternalErrorAPIException();
      }
    } catch (EmailAddresInUseException $ex) {
      throw new ConflictAPIException();
    }
    return (object)[];
  }
}
