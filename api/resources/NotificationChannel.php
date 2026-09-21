<?php
require_once('config/config.inc.php');
require_once('lib/Database.php');
require_once('lib/Exceptions.php');
require_once('resources/User.php');

class NotificationChannel {
  const TYPE_EMAIL = 0;
  const TYPE_WEBHOOK = 1;
  const ACCOUNT_CHANNEL_ID = 0;
  const MAX_PAYLOAD_BYTES = 16384;

  public $channelId;
  public $type;
  public $destination;
  public $enabled;
  public $builtIn;
  public $payload;

  function __construct() {
    $this->channelId = intval($this->channelId);
    $this->type = intval($this->type);
    $this->enabled = intval($this->enabled) != 0;
    $this->builtIn = intval($this->builtIn) != 0;
    if ($this->payload === null) {
      $this->payload = '';
    }
  }
}

class NotificationChannelManager {
  private $authToken;
  private $userManager;

  function __construct($authToken) {
    $this->authToken = $authToken;
    $this->userManager = new UserManager($this->authToken);
  }

  public function getNotificationChannels() {
    $profile = $this->userManager->getProfile();
    $result = [];
    $result[] = $this->syntheticAccountChannel($profile);

    $stmt = Database::get()->prepare('SELECT `channelid` AS `channelId`, `type`, `destination`, `enabled`, `settings` FROM `notificationchannel` WHERE `userid`=:userId ORDER BY `channelid` ASC');
    $stmt->execute([':userId' => $this->authToken->userId]);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $channel = $this->fromRow($row);
      if ($channel->type === NotificationChannel::TYPE_EMAIL
          && strcasecmp($channel->destination, $profile->email) === 0) {
        continue;
      }
      $result[] = $channel;
    }

    return $result;
  }

  public function createNotificationChannel($type, $destination, $enabled, $payload) {
    $maxChannels = $this->userManager->getGroup()->maxNotificationChannels;
    if ($this->countStoredChannels() + 1 > $maxChannels) {
      throw new QuotaExceededException();
    }

    $type = intval($type);
    $normalized = $this->normalizeChannel($type, $destination, $payload);
    $settings = $this->encodeSettings($type, $normalized['payload'], []);

    Database::get()->prepare('INSERT INTO `notificationchannel`(`userid`, `type`, `destination`, `enabled`, `settings`) '
        . 'VALUES(:userId, :type, :destination, :enabled, :settings)')
      ->execute([
        ':userId'      => $this->authToken->userId,
        ':type'        => $type,
        ':destination' => $normalized['destination'],
        ':enabled'     => $enabled ? 1 : 0,
        ':settings'    => $settings
      ]);
  }

  public function updateNotificationChannel($channelId, $destination, $enabled, $payload) {
    $channelId = intval($channelId);
    if ($channelId === NotificationChannel::ACCOUNT_CHANNEL_ID) {
      throw new InvalidArgumentsException();
    }

    $existing = $this->getStoredChannel($channelId);
    if ($existing === false) {
      throw new InvalidArgumentsException();
    }

    $normalized = $this->normalizeChannel($existing['type'], $destination, $payload);
    $settings = $this->encodeSettings($existing['type'], $normalized['payload'], $this->decodeSettings($existing['settings']));

    Database::get()->prepare('UPDATE `notificationchannel` SET `destination`=:destination, `enabled`=:enabled, `settings`=:settings WHERE `channelid`=:channelId AND `userid`=:userId')
      ->execute([
        ':userId'      => $this->authToken->userId,
        ':channelId'   => $channelId,
        ':destination' => $normalized['destination'],
        ':enabled'     => $enabled ? 1 : 0,
        ':settings'    => $settings
      ]);
  }

  public function deleteNotificationChannel($channelId) {
    $channelId = intval($channelId);
    if ($channelId === NotificationChannel::ACCOUNT_CHANNEL_ID) {
      throw new InvalidArgumentsException();
    }

    Database::get()->prepare('DELETE FROM `notificationchannel` WHERE `channelid`=:channelId AND `userid`=:userId')
      ->execute([
        ':userId'    => $this->authToken->userId,
        ':channelId' => $channelId
      ]);
  }

  private function countStoredChannels() {
    $stmt = Database::get()->prepare('SELECT COUNT(*) FROM `notificationchannel` WHERE `userid`=:userId');
    $stmt->execute([':userId' => $this->authToken->userId]);
    return intval($stmt->fetchColumn());
  }

  private function getStoredChannel($channelId) {
    $stmt = Database::get()->prepare('SELECT `channelid`, `type`, `destination`, `enabled`, `settings` FROM `notificationchannel` WHERE `userid`=:userId AND `channelid`=:channelId');
    $stmt->execute([
      ':userId'    => $this->authToken->userId,
      ':channelId' => $channelId
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row === false) {
      return false;
    }
    $row['type'] = intval($row['type']);
    return $row;
  }

  private function syntheticAccountChannel($profile) {
    $channel = new NotificationChannel();
    $channel->channelId = NotificationChannel::ACCOUNT_CHANNEL_ID;
    $channel->type = NotificationChannel::TYPE_EMAIL;
    $channel->destination = $profile->email;
    $channel->enabled = !$profile->notificationsAutoDisabled;
    $channel->builtIn = true;
    $channel->payload = '';
    return $channel;
  }

  private function fromRow($row) {
    $settings = $this->decodeSettings($row['settings']);
    $channel = new NotificationChannel();
    $channel->channelId = intval($row['channelId']);
    $channel->type = intval($row['type']);
    $channel->destination = $row['destination'];
    $channel->enabled = intval($row['enabled']) != 0;
    $channel->builtIn = false;
    $channel->payload = '';
    if ($channel->type === NotificationChannel::TYPE_WEBHOOK && isset($settings['payload']) && is_string($settings['payload'])) {
      $channel->payload = $settings['payload'];
    }
    return $channel;
  }

  private function normalizeChannel($type, $destination, $payload) {
    if ($type !== NotificationChannel::TYPE_EMAIL && $type !== NotificationChannel::TYPE_WEBHOOK) {
      throw new InvalidArgumentsException();
    }

    $destination = trim((string)$destination);
    if ($destination === '' || strlen($destination) > 255) {
      throw new InvalidArgumentsException();
    }

    $normalizedPayload = '';
    if ($type === NotificationChannel::TYPE_EMAIL) {
      if (filter_var($destination, FILTER_VALIDATE_EMAIL) === false) {
        throw new InvalidArgumentsException();
      }
      $profile = $this->userManager->getProfile();
      if (strcasecmp($destination, $profile->email) === 0) {
        throw new InvalidArgumentsException();
      }
    } else {
      if (!$this->isHttpUrl($destination)) {
        throw new InvalidArgumentsException();
      }
      $normalizedPayload = $this->normalizePayload($payload);
    }

    return [
      'destination' => $destination,
      'payload'     => $normalizedPayload
    ];
  }

  private function normalizePayload($payload) {
    if ($payload === null || $payload === '') {
      return '{}';
    }
    if (!is_string($payload) || strlen($payload) > NotificationChannel::MAX_PAYLOAD_BYTES) {
      throw new InvalidArgumentsException();
    }
    json_decode($payload);
    if (json_last_error() !== JSON_ERROR_NONE) {
      throw new InvalidArgumentsException();
    }
    return $payload;
  }

  private function isHttpUrl($url) {
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
      return false;
    }
    $scheme = strtolower((string)parse_url($url, PHP_URL_SCHEME));
    return $scheme === 'http' || $scheme === 'https';
  }

  private function decodeSettings($raw) {
    if (!is_string($raw) || $raw === '') {
      return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
  }

  private function encodeSettings($type, $payload, $existingSettings) {
    if ($type !== NotificationChannel::TYPE_WEBHOOK) {
      return '{}';
    }
    $settings = is_array($existingSettings) ? $existingSettings : [];
    $settings['payload'] = $payload;
    return json_encode($settings);
  }
}
