<?php
require_once('lib/JWT.php');

class SessionToken {
  public $expires;
  public $userId;
  public $userGroupId;
  
  function __construct($userId, $userGroupId, $expires = 0) {
    global $config;
    $this->expires = $expires ? $expires : time() + $config['sessionTokenLifetime'];
    $this->userId = $userId;
    $this->userGroupId = $userGroupId;
  }

  public function isExpired() {
    return $this->expires < time();
  }

  public function refresh($expires = 0) {
    global $config;
    $this->expires = $expires ? $expires : time() + $config['sessionTokenLifetime'];
  }

  public function toJwt() {
    global $config;
    return JWT::encode(array(
      'exp' => $this->expires,
      'sub' => $this->userId,
      'gid' => $this->userGroupId,
      'scp' => 'session'
    ), $config['sessionTokenSecret']);
  }

  public static function fromJwt($jwt) {
    global $config;
    $payload = JWT::decode($jwt, $config['sessionTokenSecret']);
    if (!isset($payload->scp) || $payload->scp !== 'session') {
      throw new InvalidJWTTokenException('Tag not suitable!');
    }
    return new SessionToken($payload->sub, $payload->gid, $payload->exp);
  }
}
