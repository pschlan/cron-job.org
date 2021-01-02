<?php
require_once('./config/config.inc.php');

require_once('./lib/Database.php');
require_once('./lib/RedisConnection.php');
require_once('./lib/Language.php');
require_once('./lib/APIDispatcher.php');

Language::initialize();
Database::initialize(
  $config['db']['host'],
  $config['db']['user'],
  $config['db']['password'],
  $config['db']['database']
);

if (isset($config['redis'])) {
  RedisConnection::initialize(
    $config['redis']['host'],
    $config['redis']['port'],
    $config['redis']['auth']
  );
}

$dispatcher = new APIDispatcher();
$dispatcher->registerDirectory('./apimethods/');
$dispatcher->dispatch();
