<?php
require_once('lib/JWT.php');
require_once('lib/Exceptions.php');

class NotificationChannelConfirmationToken {
  const EMAIL_HASH_LENGTH = 16;

  public $expires;
  public $userId;
  public $channelId;
  public $emailHash;

  function __construct($userId, $channelId, $emailHash, $expires = 0) {
    global $config;
    $lifetime = isset($config['emailVerificationTokenLifetime'])
      ? $config['emailVerificationTokenLifetime']
      : 3 * 86400;
    $this->expires = $expires ? $expires : time() + $lifetime;
    $this->userId = $userId;
    $this->channelId = $channelId;
    $this->emailHash = $emailHash;
  }

  public static function fromEmail($userId, $channelId, $email) {
    return new NotificationChannelConfirmationToken($userId, $channelId, self::hashEmail($email));
  }

  public function isExpired() {
    return $this->expires < time();
  }

  public function toJwt() {
    return JWT::encode(array(
      'exp' => $this->expires,
      'sub' => $this->userId,
      'chn' => $this->channelId,
      'adh' => $this->emailHash,
      'scp' => 'notificationChannelConfirmation'
    ), self::secret());
  }

  public static function fromJwt($jwt) {
    $payload = JWT::decode($jwt, self::secret());
    if (!isset($payload->scp) || $payload->scp !== 'notificationChannelConfirmation') {
      throw new InvalidJWTTokenException('Tag not suitable!');
    }
    if (!isset($payload->sub) || !isset($payload->chn) || !isset($payload->adh) || !isset($payload->exp)) {
      throw new InvalidJWTTokenException('Invalid JWT token.');
    }
    if (!is_string($payload->adh) || strlen($payload->adh) !== self::EMAIL_HASH_LENGTH) {
      throw new InvalidJWTTokenException('Invalid JWT token.');
    }
    return new NotificationChannelConfirmationToken($payload->sub, $payload->chn, $payload->adh, $payload->exp);
  }

  public function matchesEmail($email) {
    return hash_equals($this->emailHash, self::hashEmail($email));
  }

  public static function hashEmail($email) {
    return substr(hash_hmac('sha256', strtolower(trim($email)), self::hashSecret()), 0, self::EMAIL_HASH_LENGTH);
  }

  private static function secret() {
    global $config;
    return self::requireSecret($config, 'notificationChannelConfirmationTokenSecret');
  }

  private static function hashSecret() {
    global $config;
    return self::requireSecret($config, 'notificationChannelConfirmationEmailHashSecret');
  }

  private static function requireSecret($config, $key) {
    if (!isset($config[$key]) || !is_string($config[$key]) || $config[$key] === '') {
      throw new InternalErrorException();
    }
    return $config[$key];
  }
}
