<?php
require_once('config/config.inc.php');
require_once('lib/Database.php');
require_once('lib/Exceptions.php');
require_once('lib/Mail.php');
require_once('lib/Language.php');
require_once('lib/RateLimiter.php');
require_once('lib/NotificationChannelConfirmationToken.php');
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
  public $confirmed;
  public $builtIn;
  public $payload;

  function __construct() {
    $this->channelId = intval($this->channelId);
    $this->type = intval($this->type);
    $this->enabled = intval($this->enabled) != 0;
    $this->confirmed = intval($this->confirmed) != 0;
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

    $stmt = Database::get()->prepare('SELECT `channelid` AS `channelId`, `type`, `destination`, `enabled`, `confirmed`, `settings` FROM `notificationchannel` WHERE `userid`=:userId ORDER BY `channelid` ASC');
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

  public function createNotificationChannel($type, $destination, $enabled, $payload, $language) {
    $type = intval($type);
    $normalized = $this->normalizeChannel($type, $destination, $payload);
    $isEmail = $type === NotificationChannel::TYPE_EMAIL;

    if ($isEmail) {
      if (!RateLimiter::claimNotificationChannelEmailCreate($this->authToken->userId, $normalized['destination'])) {
        throw new RateLimitExceededException();
      }
    }

    $maxChannels = $this->userManager->getGroup()->maxNotificationChannels;
    if ($this->countStoredChannels() + 1 > $maxChannels) {
      throw new QuotaExceededException();
    }

    $settings = $this->encodeSettings($type, $normalized['payload'], []);
    $confirmed = $isEmail ? 0 : 1;
    $enabledValue = $isEmail ? 0 : ($enabled ? 1 : 0);

    Database::get()->prepare('INSERT INTO `notificationchannel`(`userid`, `type`, `destination`, `enabled`, `confirmed`, `settings`) '
        . 'VALUES(:userId, :type, :destination, :enabled, :confirmed, :settings)')
      ->execute([
        ':userId'      => $this->authToken->userId,
        ':type'        => $type,
        ':destination' => $normalized['destination'],
        ':enabled'     => $enabledValue,
        ':confirmed'   => $confirmed,
        ':settings'    => $settings
      ]);

    $channelId = intval(Database::get()->insertId());

    if ($isEmail) {
      if (!$this->sendConfirmationEmail($channelId, $normalized['destination'], $language)) {
        Database::get()->prepare('DELETE FROM `notificationchannel` WHERE `channelid`=:channelId AND `userid`=:userId')
          ->execute([
            ':channelId' => $channelId,
            ':userId'    => $this->authToken->userId
          ]);
        throw new InternalErrorException();
      }
    }
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

    if (intval($existing['type']) === NotificationChannel::TYPE_EMAIL) {
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

  public function setNotificationChannelEnabled($channelId, $enabled) {
    $channelId = intval($channelId);
    if ($channelId === NotificationChannel::ACCOUNT_CHANNEL_ID) {
      Database::get()->prepare('UPDATE `user` SET `email_notifications_enabled`=:enabled WHERE `userid`=:userId')
        ->execute([
          ':userId'  => $this->authToken->userId,
          ':enabled' => $enabled ? 1 : 0
        ]);
      return;
    }

    $existing = $this->getStoredChannel($channelId);
    if ($existing === false) {
      throw new InvalidArgumentsException();
    }

    if (intval($existing['type']) === NotificationChannel::TYPE_EMAIL && intval($existing['confirmed']) == 0) {
      throw new InvalidArgumentsException();
    }

    Database::get()->prepare('UPDATE `notificationchannel` SET `enabled`=:enabled WHERE `channelid`=:channelId AND `userid`=:userId')
      ->execute([
        ':userId'    => $this->authToken->userId,
        ':channelId' => $channelId,
        ':enabled'   => $enabled ? 1 : 0
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

  public static function confirmNotificationChannelEmail($jwt) {
    $token = NotificationChannelConfirmationToken::fromJwt($jwt);
    if ($token->isExpired()) {
      throw new TokenExpiredException();
    }

    $stmt = Database::get()->prepare('SELECT `channelid`, `userid`, `type`, `destination`, `confirmed` FROM `notificationchannel` WHERE `channelid`=:channelId AND `userid`=:userId');
    $stmt->execute([
      ':channelId' => intval($token->channelId),
      ':userId'    => intval($token->userId)
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row === false) {
      throw new InvalidArgumentsException();
    }
    if (intval($row['type']) !== NotificationChannel::TYPE_EMAIL) {
      throw new InvalidArgumentsException();
    }
    if (!$token->matchesEmail($row['destination'])) {
      throw new InvalidArgumentsException();
    }
    if (intval($row['confirmed']) != 0) {
      return true;
    }

    Database::get()->prepare('UPDATE `notificationchannel` SET `confirmed`=1, `enabled`=1 WHERE `channelid`=:channelId AND `userid`=:userId')
      ->execute([
        ':channelId' => intval($token->channelId),
        ':userId'    => intval($token->userId)
      ]);
    return true;
  }

  private function sendConfirmationEmail($channelId, $email, $language) {
    global $config;

    $confirmationToken = NotificationChannelConfirmationToken::fromEmail($this->authToken->userId, $channelId, $email);

    $mail = new Mail();
    $mail->setVerp('channelconfirm', $channelId, $config);
    $mail->setSender($config['emailSender']);
    $mail->setRecipient($email);
    $mail->setPlainText(Mail::loadTemplate('text'));
    $mail->setHtmlText(Mail::loadTemplate('html'));
    $mail->setSubject(Language::getPhrase('confirmNotificationChannelEmail.subject', $language));

    $mail->assign('projectName', $config['projectName']);
    $mail->assign('projectURL', $config['projectURL']);
    $mail->assign('logoURL', $config['logoURL']);
    $mail->assign('year', date('Y'));
    $mail->assign('unsubscribeFooter', Language::getPhrase('confirmNotificationChannelEmail.footer', $language));
    $mail->assign('body', Language::getPhrase('confirmNotificationChannelEmail.body', $language));
    $mail->assign('confirmationLink', $config['frontendURL'] . 'confirmNotificationChannel/' . urlencode($confirmationToken->toJwt()));
    $mail->assign('email', $email);

    return $mail->send();
  }

  private function countStoredChannels() {
    $stmt = Database::get()->prepare('SELECT COUNT(*) FROM `notificationchannel` WHERE `userid`=:userId');
    $stmt->execute([':userId' => $this->authToken->userId]);
    return intval($stmt->fetchColumn());
  }

  private function getStoredChannel($channelId) {
    $stmt = Database::get()->prepare('SELECT `channelid`, `type`, `destination`, `enabled`, `confirmed`, `settings` FROM `notificationchannel` WHERE `userid`=:userId AND `channelid`=:channelId');
    $stmt->execute([
      ':userId'    => $this->authToken->userId,
      ':channelId' => $channelId
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row === false) {
      return false;
    }
    $row['type'] = intval($row['type']);
    $row['confirmed'] = intval($row['confirmed']);
    return $row;
  }

  private function syntheticAccountChannel($profile) {
    $channel = new NotificationChannel();
    $channel->channelId = NotificationChannel::ACCOUNT_CHANNEL_ID;
    $channel->type = NotificationChannel::TYPE_EMAIL;
    $channel->destination = $profile->email;
    $channel->enabled = $profile->emailNotificationsEnabled && !$profile->notificationsAutoDisabled;
    $channel->confirmed = true;
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
    $channel->confirmed = intval($row['confirmed']) != 0;
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
      $destination = strtolower($destination);
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
    try {
      json_decode($payload, false, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $ex) {
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
