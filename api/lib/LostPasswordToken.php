<?php
require_once('lib/JWT.php');

class LostPasswordToken {
  public $expires;
  public $userId;
  public $salt;
  
  function __construct($userId, $salt, $expires = 0) {
    global $config;
    $this->expires = $expires ? $expires : time() + $config['lostPasswordTokenLifetime'];
    $this->userId = $userId;
    $this->salt = $salt;
  }

  public function isExpired() {
    return $this->expires < time();
  }

  public function toJwt() {
    global $config;
    return JWT::encode(array(
      'exp' => $this->expires,
      'sub' => $this->userId,
      'slt' => $this->salt,
      'scp' => 'lostPassword'
    ), $config['lostPasswordTokenSecret']);
  }

  public static function fromJwt($jwt) {
    global $config;
    $payload = JWT::decode($jwt, $config['lostPasswordTokenSecret']);
    if (!isset($payload->scp) || $payload->scp !== 'lostPassword') {
      throw new InvalidJWTTokenException('Tag not suitable!');
    }
    return new LostPasswordToken($payload->sub, $payload->slt, $payload->exp);
  }
}
