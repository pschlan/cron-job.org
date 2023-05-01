<?php
require_once('lib/APIMethod.php');
require_once('resources/MFADevice.php');

class GetMFADevices extends AbstractAPIMethod {
  static function name() {
    return 'GetMFADevices';
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
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    $mfaDevices = (new MFADeviceManager($sessionToken))
      ->getMFADevices();

    return (object)[
      'mfaDevices' => array_values(array_filter($mfaDevices, function ($device) {
        return $device->enabled;
      }))
    ];
  }
}
