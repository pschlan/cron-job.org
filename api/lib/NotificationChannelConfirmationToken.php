<?php
require_once('lib/JWT.php');

class NotificationChannelConfirmationToken {
  public $expires;
  public $userId;
  public $channelId;
  public $email;

  function __construct($userId, $channelId, $email, $expires = 0) {
    global $config;
    $lifetime = isset($config['emailVerificationTokenLifetime'])
      ? $config['emailVerificationTokenLifetime']
      : 3 * 86400;
    $this->expires = $expires ? $expires : time() + $lifetime;
    $this->userId = $userId;
    $this->channelId = $channelId;
    $this->email = $email;
  }

  public function isExpired() {
    return $this->expires < time();
  }

  public function toJwt() {
    global $config;
    return JWT::encode(array(
      'exp' => $this->expires,
      'sub' => $this->userId,
      'chn' => $this->channelId,
      'adr' => $this->email,
      'scp' => 'notificationChannelConfirmation'
    ), self::secret());
  }

  public static function fromJwt($jwt) {
    $payload = JWT::decode($jwt, self::secret());
    if (!isset($payload->scp) || $payload->scp !== 'notificationChannelConfirmation') {
      throw new InvalidJWTTokenException('Tag not suitable!');
    }
    if (!isset($payload->sub) || !isset($payload->chn) || !isset($payload->adr) || !isset($payload->exp)) {
      throw new InvalidJWTTokenException('Invalid JWT token.');
    }
    return new NotificationChannelConfirmationToken($payload->sub, $payload->chn, $payload->adr, $payload->exp);
  }

  private static function secret() {
    global $config;
    if (!empty($config['notificationChannelConfirmationTokenSecret'])) {
      return $config['notificationChannelConfirmationTokenSecret'];
    }
    return $config['emailVerificationTokenSecret'];
  }
}
