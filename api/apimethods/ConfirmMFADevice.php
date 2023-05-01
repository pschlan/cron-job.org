<?php
require_once('lib/APIMethod.php');
require_once('resources/MFADevice.php');

class ConfirmMFADevice extends AbstractAPIMethod {
  static function name() {
    return 'ConfirmMFADevice';
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
      && isset($request->code)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new MFADeviceManager($sessionToken))
        ->confirmMFADevice($request->mfaDeviceId, $request->code);

      return (object)[];
    } catch (InvalidMFACodeException $ex) {
      throw new ForbiddenAPIException();
    } catch (MFADeviceNotFoundException $ex) {
      throw new NotFoundAPIException();
    }
  }
}
