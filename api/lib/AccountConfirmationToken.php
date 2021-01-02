<?php
require_once('lib/JWT.php');

class AccountConfirmationToken {
  public $expires;
  public $userId;
  
  function __construct($userId, $expires = 0) {
    global $config;
    $this->expires = $expires ? $expires : time() + $config['accountConfirmationTokenLifetime'];
    $this->userId = $userId;
  }

  public function isExpired() {
    return $this->expires < time();
  }

  public function toJwt() {
    global $config;
    return JWT::encode(array(
      'exp' => $this->expires,
      'sub' => $this->userId,
      'scp' => 'accountConfirmation'
    ), $config['accountConfirmationTokenSecret']);
  }

  public static function fromJwt($jwt) {
    global $config;
    $payload = JWT::decode($jwt, $config['accountConfirmationTokenSecret']);
    if (!isset($payload->scp) || $payload->scp !== 'accountConfirmation') {
      throw new InvalidJWTTokenException('Tag not suitable!');
    }
    return new AccountConfirmationToken($payload->sub, $payload->exp);
  }
}
