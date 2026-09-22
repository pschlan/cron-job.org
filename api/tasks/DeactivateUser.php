<?php
require_once('lib/Task.php');
require_once('lib/Database.php');
require_once('resources/Node.php');

class DeactivateUser implements Task {
  public function run() {
    for ($i = 2; $i < count($_SERVER['argv']); ++$i) {
      $userId = intval($_SERVER['argv'][$i]);
      if ($userId === 0) {
        echo "Skipping invalid user id @ pos $i!\n";
      }

      echo "Processing user $userId... ";

      $stmt = Database::get()->prepare('SELECT `status`, `email` FROM `user` WHERE `userid`=:userId');
      $stmt->execute([':userId' => $userId]);
      $row = $stmt->fetch(PDO::FETCH_OBJ);

      if (!$row) {
        echo "Not found\n";
        continue;
      }

      $status = intval($row->status);
      if ($status !== 1) {
        echo "Aready deactivated or not yet activated!\n";
        continue;
      }

      $nodes = NodeManager::getUserJobNodesWithUserId($userId);

      foreach ($nodes as $node) {
        try {
          $client = $node->connect();
          $client->disableJobsForUser($userId);
        } catch (Exception $ex) {
          printf('Failed to deactivate user jobs on %d (%s): %s', $node->nodeId, $node->ip, $ex);
          $someFailed = true;
        }
      }

      Database::get()->prepare('UPDATE `user` SET `status`=2 WHERE `userid`=:userId')
        ->execute([':userId' => $userId]);
      echo "OK\n";
    }

    return 0;
  }
}
