<?php
require_once('lib/Task.php');
require_once('lib/Database.php');
require_once('resources/Node.php');

class UpdateScheduleLoad implements Task {
  public function run() {
    $userInfo = [];

    $stmt = Database::get()->prepare('SELECT `userid` AS `userId` FROM `user`');
    $stmt->execute();
    while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
      $userInfo[$row->userId] = 0;
    }

    $nodes = NodeManager::getAllNodes();
    foreach ($nodes as $node) {
      try {
        $client = $node->connect();
        $nodeUserInfo = $client->getUserInfoForAllUsers();
        foreach ($nodeUserInfo as $ui) {
          if (!isset($userInfo[$ui->userId])) {
            $userInfo[$ui->userId] = 0;
          }
          $userInfo[$ui->userId] += $ui->scheduleLoad;
        }
      } catch (Exception $ex) {
        printf('Failed to get user info on node %d (%s): %s - aborting!', $node->nodeId, $node->ip, $ex);
        exit;
      }
    }

    Database::get()->beginTransaction();
    $updateStmt = Database::get()->prepare('REPLACE INTO `user_schedule_load`(`userid`, `load`) VALUES(:userId, :load)');
    foreach ($userInfo as $userId => $load) {
      $updateStmt->execute([':userId' => $userId, ':load' => $load]);
    }
    Database::get()->commitTransaction();

    return 0;
  }
}
