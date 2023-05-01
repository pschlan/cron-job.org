<?php
require_once('lib/APIMethod.php');
require_once('resources/MFADevice.php');
require_once('resources/User.php');

class DeleteMFADevice extends AbstractAPIMethod {
  static function name() {
    return 'DeleteMFADevice';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND),
      new RateLimit(5, RateLimit::MINUTE)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->mfaDeviceId)
      && isset($request->password)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new UserManager($sessionToken))->verifyPassword($request->password);

      (new MFADeviceManager($sessionToken))
        ->deleteMFADevice($request->mfaDeviceId);

      return (object)[];
    } catch (WrongPasswordException $ex) {
      throw new ForbiddenAPIException();
    }
  }
}
