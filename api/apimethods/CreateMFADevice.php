<?php
require_once('lib/APIMethod.php');
require_once('resources/MFADevice.php');
require_once('resources/User.php');

class CreateMFADevice extends AbstractAPIMethod {
  const SUPPORTED_TYPES = [
    'totpDevice'      => MFADevice::TYPE_TOTP,
    'yubicoOtpDevice' => MFADevice::TYPE_YUBICO_OTP
  ];

  static function name() {
    return 'CreateMFADevice';
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
         isset($request->title)
      && isset($request->type)
      && isset(self::SUPPORTED_TYPES[$request->type])
      && isset($request->password)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new UserManager($sessionToken))->verifyPassword($request->password);

      $mfaDevice = (new MFADeviceManager($sessionToken))
        ->createMFADevice($request->title,
          self::SUPPORTED_TYPES[$request->type],
          isset($request->code) ? $request->code : false);

      if ($mfaDevice === false) {
        throw new InternalErrorAPIException();
      }

      return (object)[
        'mfaDevice' => $mfaDevice,
        'secret' => $mfaDevice->getBase32Secret()
      ];
    } catch (WrongPasswordException $ex) {
      throw new ForbiddenAPIException();
    } catch (InvalidMFACodeException $ex) {
      throw new ForbiddenAPIException();
    }
  }
}
