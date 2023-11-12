<?php
require_once('config/config.inc.php');
require_once('lib/Database.php');
require_once('lib/Exceptions.php');
require_once('lib/TOTP.php');
require_once('lib/YubicoOTP.php');

class InvalidMFATypeException extends Exception {}
class MFADeviceNotFoundException extends Exception {}
class InvalidMFACodeException extends Exception {}

class MFADevice {
  public const TYPE_TOTP = 0;
  public const TYPE_YUBICO_OTP = 1;

  public $mfaDeviceId;
  public $enabled;
  public $title;
  public $type;
  public $created;

  private $secret;

  function __construct() {
    $this->mfaDeviceId = intval($this->mfaDeviceId);
    $this->enabled = boolval($this->enabled);
    $this->type = intval($this->type);
    $this->created = intval($this->created);
  }

  function getBase32Secret() {
    return TOTP::base32Encode(base64_decode($this->secret));
  }

  function getSecret() {
    return base64_decode($this->secret);
  }
}

class MFADeviceManager {
  private $authToken;

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  public function getMFADevices() {
    $stmt = Database::get()->prepare('SELECT `mfadeviceid` AS `mfaDeviceId`, `enabled`, `title`, `secret`, `type`, `created` FROM `mfadevice` WHERE `userid`=:userId');
    $stmt->setFetchMode(PDO::FETCH_CLASS, MFADevice::class);
    $stmt->execute([':userId' => $this->authToken->userId]);

    $result = [];
    while ($entry = $stmt->fetch()) {
      $result[] = $entry;
    }

    return $result;
  }

  public function getMFADevice($mfaDeviceId) {
    $stmt = Database::get()->prepare('SELECT `mfadeviceid` AS `mfaDeviceId`, `enabled`, `title`, `secret`, `type`, `created` FROM `mfadevice` WHERE `userid`=:userId AND `mfadeviceid`=:mfaDeviceId');
    $stmt->setFetchMode(PDO::FETCH_CLASS, MFADevice::class);
    $stmt->execute([
      ':userId'         => $this->authToken->userId,
      ':mfaDeviceId'    => $mfaDeviceId
    ]);
    return $stmt->fetch();
  }

  public function createMFADevice($title, $type, $code) {
    global $config;

    $secret = '';
    $enabled = false;

    switch ($type) {
    case MFADevice::TYPE_TOTP:
      $secret = TOTP::generateSecret();
      break;

    case MFADevice::TYPE_YUBICO_OTP:
      if ($config['yubicoOTP']['enable']) {
        //! @note This is not really a secret in the YubiKey case.
        $secret = YubicoOTP::getPublicIdFromOTP($code);
        if ($secret === false) {
          throw new InvalidMFACodeException();
        }
        if (!YubicoOTP::verifyCode($secret, $code)) {
          throw new InvalidMFACodeException();
        }
        $enabled = true;
      } else {
        throw new InvalidMFATypeException();
      }
      break;

    default:
      throw new InvalidMFATypeException();
    }

    $stmt = Database::get()->prepare('INSERT INTO `mfadevice`(`userid`,`enabled`,`title`,`secret`,`type`,`created`) VALUES(:userId, :enabled, :title, :secret, :type, :created)');
    $stmt->execute([
      ':userId'   => $this->authToken->userId,
      ':enabled'  => $enabled ? 1 : 0,
      ':title'    => $title,
      ':secret'   => base64_encode($secret),
      ':type'     => $type,
      ':created'  => time()
    ]);

    $mfaDeviceId = Database::get()->insertId();
    return $this->getMFADevice($mfaDeviceId);
  }

  public function confirmMFADevice($mfaDeviceId, $code) {
    $device = $this->getMFADevice($mfaDeviceId);
    if (!$device) {
      throw new MFADeviceNotFoundException();
    }

    if ($device->enabled) {
      return;
    }

    switch ($device->type) {
    case MFADevice::TYPE_TOTP:
      $timeslot = 0;
      if (!TOTP::verifyCode($device->getSecret(), $code, $timeslot)) {
        throw new InvalidMFACodeException();
      }

      Database::get()->prepare('UPDATE `mfadevice` SET `enabled`=:enabled,`last_timeslot`=:timeslot WHERE `userid`=:userId AND `mfadeviceid`=:mfaDeviceId')
        ->execute([
          ':enabled'      => 1,
          ':timeslot'     => $timeslot,
          ':userId'       => $this->authToken->userId,
          ':mfaDeviceId'  => $mfaDeviceId
        ]);
      break;

    default:
      throw new InvalidMFATypeException();
      break;
    }
  }

  public function deleteMFADevice($mfaDeviceId) {
    Database::get()->prepare('DELETE FROM `mfadevice` WHERE `userid`=:userId AND `mfadeviceid`=:mfaDeviceId')
      ->execute([
        ':userId'       => $this->authToken->userId,
        ':mfaDeviceId'  => $mfaDeviceId
      ]);
  }

  public static function verifyMFACode($userId, $code) {
    global $config;

    $stmt = Database::get()->prepare('SELECT `mfadeviceid` AS `mfaDeviceId`, `type`, `secret`, `last_timeslot` AS `lastTimeslot` FROM `mfadevice` WHERE `userid`=:userId AND `enabled`=:enabled');
    $stmt->execute([
      ':userId'   => $userId,
      ':enabled'  => 1
    ]);

    while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
      switch ($row->type) {
      case MFADevice::TYPE_TOTP:
        $timeslot = 0;
        if (TOTP::verifyCode(base64_decode($row->secret), $code, $timeslot)) {
          if ($timeslot > intval($row->lastTimeslot)) {
            $updateStmt = Database::get()->prepare('UPDATE `mfadevice` SET `last_timeslot`=:timeslot WHERE `mfadeviceid`=:mfaDeviceId');
            $updateStmt->execute([
              ':timeslot'     => $timeslot,
              ':mfaDeviceId'  => $row->mfaDeviceId
            ]);
            return true;
          }
        }
        break;

      case MFADevice::TYPE_YUBICO_OTP:
        if ($config['yubicoOTP']['enable'] && YubicoOTP::verifyCode(base64_decode($row->secret), $code)) {
          return true;
        }
        break;

      default:
        break;
      }
    }

    return false;
  }
}
