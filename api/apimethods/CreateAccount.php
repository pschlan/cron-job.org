<?php
require_once('config/config.inc.php');
require_once('config/denylists.inc.php');
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

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    global $config;
    global $emailDenyList;

    if (isset($request->email)) {
      $lowerEmail = strtolower($request->email);
      foreach ($emailDenyList as $deniedEmail) {
        if (strpos($lowerEmail, $deniedEmail) !== false) {
          return false;
        }
      }
    }

    return (
          (isset($request->token) || $config['recaptchaSecretKey'] === null)
      &&  isset($request->firstName)
      &&  isset($request->lastName)
      &&  isset($request->email)
      &&  isset($request->password)
      &&  isset($request->timezone)
      &&  $request->firstName !== $request->email
      &&  $request->lastName !== $request->email
    );
  }

  public function execute($request, $sessionToken, $language) {
    global $config;

    if ($config['recaptchaSecretKey'] !== null && !RecaptchaVerifier::verify($config['recaptchaSecretKey'], $request->token)) {
      throw new ForbiddenAPIException();
    }

    if (in_array($request->timezone, DateTimeZone::listIdentifiers())) {
      $timezone = $request->timezone;
    } else {
      $timezone = 'UTC';
    }

    try {
      if (!UserManager::createAccount(
            trim($request->email),
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
