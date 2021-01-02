<?php
class DatabaseTransactionException extends Exception {
}

class Database {
  private static $instance;
  private $connection;

  private function __construct($host, $user, $password, $db) {
    $this->connection = new PDO('mysql:host=' . $host . ';dbname=' . $db,
      $user,
      $password);
    $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $this->exec('SET NAMES utf8');
  }

  public static function initialize($host, $user, $password, $db) {
    self::$instance = new Database($host, $user, $password, $db);
  }

  public static function get() {
    return self::$instance;
  }

  public function exec($query) {
    return $this->connection->exec($query);
  }

  public function prepare($query) {
    return $this->connection->prepare($query);
  }

  public function beginTransaction() {
    if (!$this->connection->beginTransaction()) {
      throw new DatabaseTransactionException();
    }
  }

  public function commitTransaction() {
    if (!$this->connection->commit()) {
      throw new DatabaseTransactionException();
    }
  }

  public function rollbackTransaction() {
    if (!$this->connection->rollBack()) {
      throw new DatabaseTransactionException();
    }
  }

  public function insertId() {
    return $this->connection->lastInsertId();
  }
}
