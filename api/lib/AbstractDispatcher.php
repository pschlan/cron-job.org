<?php
abstract class AbstractDispatcher {
  protected $handlers = array();

  public function register($class) {
    $this->handlers[$class::name()] = function() use($class) {
      return new $class;
    };
  }

  public function registerDirectory($directory) {
    if (substr($directory, 0, -1) != '/') {
      $directory .= '/';
    }

    $d = dir($directory);
    while (($entry = $d->read()) !== false) {
      if (substr($entry, 0, 1) === '.' || substr($entry, -4) !== '.php') {
        continue;
      }

      $fileName = $directory . $entry;
      if (!is_file($fileName)) {
        continue;
      }

      $apiName = substr($entry, 0, -4);
      $this->handlers[$apiName] = function() use($apiName, $fileName) {
        require_once($fileName);
        return new $apiName;
      };
    }
  }

  abstract public function dispatch();
}
