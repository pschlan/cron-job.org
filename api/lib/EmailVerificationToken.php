<?php
require_once('lib/JWT.php');

class EmailVerificationToken {
  public $expires;
  public $userId;
  public $email;
  
  function __construct($userId, $email, $expires = 0) {
    global $config;
    $this->expires = $expires ? $expires : time() + $config['emailVerificationTokenLifetime'];
    $this->userId = $userId;
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
      'adr' => $this->email,
      'scp' => 'emailVerification'
    ), $config['emailVerificationTokenSecret']);
  }

  public static function fromJwt($jwt) {
    global $config;
    $payload = JWT::decode($jwt, $config['emailVerificationTokenSecret']);
    if (!isset($payload->scp) || $payload->scp !== 'emailVerification') {
      throw new InvalidJWTTokenException('Tag not suitable!');
    }
    return new EmailVerificationToken($payload->sub, $payload->adr, $payload->exp);
  }
}
