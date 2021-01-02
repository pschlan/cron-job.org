<?php
class RedisConnectionException extends Exception {}

class RedisConnection {
  private static $instance = null;
  private $connection;

  private function __construct($host, $port, $auth) {
    $this->connection = new Redis();
    if (!$this->connection->connect($host, $port)) {
      throw new RedisConnectionException('Failed to connect to redis!');
    }
    if ($auth !== false) {
      if (!$this->connection->auth($auth)) {
        throw new RedisConnectionException('Failed to authenticate against redis!');
      }
    }
  }

  public static function initialize($host, $port, $auth) {
    self::$instance = new RedisConnection($host, $port, $auth);
  }

  public static function get() {
    if (self::$instance === null) {
      return null;
    }
    return self::$instance->connection;
  }
}
