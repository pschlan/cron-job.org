<?php
try {
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

  if (empty($_SERVER['PATH_INFO'])) {
    $_SERVER['PATH_INFO'] = '/';
  }

  if ($_SERVER['PATH_INFO'] === '/') {
    require_once('./lib/APIDispatcher.php');

    $dispatcher = new APIDispatcher();
    $dispatcher->registerRefreshTokenHandler(UserManager::getRefreshTokenHandler());

  } else if ($_SERVER['PATH_INFO'] === '/executor-nodes.json') {
    $stmt = Database::get()->prepare('SELECT `public_ip` AS `publicIp` FROM `node` WHERE `enabled`=1 ORDER BY `nodeid` ASC');
    $stmt->execute();

    $ipAddresses = [];
    while ($entry = $stmt->fetch(PDO::FETCH_OBJ)) {
      if (!empty($entry->publicIp)) {
        $ipAddresses[] = $entry->publicIp;
      }
    }

    header('HTTP/1.1 200 OK');
    header('Content-Type: application/json');

    echo json_encode((object)[
      'ipAddresses' => $ipAddresses
    ]);

    exit();

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

} catch (Exception $ex) {
  error_log('Unhandled top level API exception: ' . (string)$ex);
  header('HTTP/1.1 500 Internal Server Error');
  exit();
}