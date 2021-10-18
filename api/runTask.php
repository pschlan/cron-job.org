<?php
if (php_sapi_name() !== 'cli') {
  exit();
}

chdir(__DIR__);

require_once('./config/config.inc.php');

require_once('./lib/Database.php');
require_once('./lib/Language.php');

Language::initialize();
Database::initialize(
  $config['db']['host'],
  $config['db']['user'],
  $config['db']['password'],
  $config['db']['database']
);

if (count($_SERVER['argv']) != 2) {
  printf("Usage: %s <task-name>\n", $_SERVER['argv'][0]);
  exit(1);
}

$taskName = preg_replace('/[^a-zA-Z0-9]/', '', $_SERVER['argv'][1]);
$taskFileName = 'tasks/' . $taskName . '.php';
if (!file_exists($taskFileName)) {
  printf("Task not found: %s\n", $taskFileName);
  exit(1);
}

// Acquire lock
$lockFileName = '/tmp/.cjo-task.' . $taskName . '.lock';
$lockFp = fopen($lockFileName, 'w+');
if (!flock($lockFp, LOCK_EX | LOCK_NB)) {
  printf("Could not acquire lock: %s - aborting.\n", $lockFileName);
	exit(0);
}

// Execute task
include($taskFileName);
$task = new $taskName();
$result = $task->run();

// Release lock
flock($lockFp, LOCK_UN);
fclose($lockFp);

exit($result);
