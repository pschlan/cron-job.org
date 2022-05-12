<?php
require_once('./config/config.inc.php');

require_once('./lib/Database.php');
require_once('./lib/RedisConnection.php');
require_once('./lib/Language.php');
require_once('./resources/User.php');

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

if ($_SERVER['REQUEST_URI'] === '/') {
  require_once('./lib/APIDispatcher.php');

  $dispatcher = new APIDispatcher();
  $dispatcher->registerRefreshTokenHandler(UserManager::getRefreshTokenHandler());

} else {
  require_once('./lib/RESTDispatcher.php');

  $dispatcher = new RESTDispatcher();
  $dispatcher->registerURI('GET', '/jobs', 'GetJobs');
  $dispatcher->registerURI('PUT', '/jobs', 'CreateJob');

  $dispatcher->registerURI('GET', '/jobs/(?<jobId>[0-9]+)', 'GetJobDetails');
  $dispatcher->registerURI('PATCH', '/jobs/(?<jobId>[0-9]+)', 'PatchJob');
  $dispatcher->registerURI('DELETE', '/jobs/(?<jobId>[0-9]+)', 'DeleteJob');

  $dispatcher->registerURI('GET', '/jobs/(?<jobId>[0-9]+)/history', 'GetJobHistory');
  $dispatcher->registerURI('GET', '/jobs/(?<jobId>[0-9]+)/history/(?<identifier>[0-9-]+)', 'GetJobHistoryDetails');
}

$dispatcher->registerDirectory('./apimethods/');
$dispatcher->dispatch();
