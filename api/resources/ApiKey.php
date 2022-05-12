<?php
require_once('config/config.inc.php');
require_once('lib/Database.php');
require_once('lib/Exceptions.php');
require_once('resources/User.php');

class ApiKey {
  public $apiKeyId;
  public $enabled;
  public $created;
  public $limitIPs;

  private $apiKey;

  function __construct() {
    $this->apiKeyId = intval($this->apiKeyId);
    $this->enabled = boolval($this->enabled);
    $this->created = intval($this->created);

    if (is_string($this->limitIPs)) {
      $this->limitIPs = array_filter(array_map('trim', explode(',', $this->limitIPs)), function ($val) {
        return $val !== '';
      });
    }
  }

  function getApiKey() {
    return $this->apiKey;
  }
}

class APIKeyManager {
  const RAW_LENGTH = 32;

  private $authToken;
  private $userManager;

  function __construct($authToken) {
    $this->authToken = $authToken;
    $this->userManager = new UserManager($this->authToken);
  }

  public function getAPIKeys() {
    $stmt = Database::get()->prepare('SELECT `apikeyid` AS `apiKeyId`, `apikey` AS `apiKey`, `enabled`, `title`, `limit_ips` AS `limitIPs`, `created` FROM `apikey` WHERE `userid`=:userId');
    $stmt->setFetchMode(PDO::FETCH_CLASS, ApiKey::class);
    $stmt->execute([':userId' => $this->authToken->userId]);

    $result = [];
    while ($entry = $stmt->fetch()) {
      $result[] = $entry;
    }

    return $result;
  }

  public function getAPIKey($apiKeyId) {
    $stmt = Database::get()->prepare('SELECT `apikeyid` AS `apiKeyId`, `apikey` AS `apiKey`, `enabled`, `title`, `limit_ips` AS `limitIPs`, `created` FROM `apikey` WHERE `userid`=:userId AND `apikeyid`=:apiKeyId');
    $stmt->setFetchMode(PDO::FETCH_CLASS, ApiKey::class);
    $stmt->execute([
      ':userId'   => $this->authToken->userId,
      ':apiKeyId' => $apiKeyId
    ]);
    return $stmt->fetch();
  }

  public function deleteAPIKey($apiKeyId) {
    Database::get()->prepare('DELETE FROM `apikey` WHERE `apikeyid`=:apiKeyId AND `userid`=:userId')
      ->execute([
        ':userId'   => $this->authToken->userId,
        ':apiKeyId' => $apiKeyId
      ]);
  }

  public function createAPIKey($title, $limitIPs) {
    $maxApiKeys = $this->userManager->getGroup()->maxApiKeys;
    if (count($this->getAPIKeys()) + 1 > $maxApiKeys) {
      throw new QuotaExceededException();
    }

    $apiKey = self::generateAPIKey();
    $limitIPs = self::serializeIPs($limitIPs);

    Database::get()->prepare('INSERT INTO `apikey`(`userid`, `apikey`, `title`, `enabled`, `limit_ips`, `created`) '
        . 'VALUES(:userId, :apiKey, :title, :enabled, :limitIPs, :created)')
      ->execute([
        ':userId'   => $this->authToken->userId,
        ':apiKey'   => $apiKey,
        ':title'    => $title,
        ':enabled'  => 1,
        ':limitIPs' => $limitIPs,
        ':created'  => time()
      ]);
  }

  public function updateAPIKey($apiKeyId, $title, $limitIPs) {
    $limitIPs = self::serializeIPs($limitIPs);

    Database::get()->prepare('UPDATE `apikey` SET `title`=:title, `limit_ips`=:limitIPs WHERE `apikeyid`=:apiKeyId AND `userid`=:userId')
      ->execute([
        ':userId'   => $this->authToken->userId,
        ':apiKeyId' => $apiKeyId,
        ':title'    => $title,
        ':limitIPs' => $limitIPs
      ]);
  }

  private static function generateAPIKey() {
    return base64_encode(random_bytes(self::RAW_LENGTH));
  }

  private static function serializeIPs($ips) {
    return implode(',', array_filter(array_map('trim', $ips), function ($val) {
      return preg_match('/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/', $val);
    }));
  }
}
