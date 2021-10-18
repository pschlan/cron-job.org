<?php
require_once('lib/Task.php');
require_once('lib/Database.php');
require_once('resources/Node.php');

class ProcessUserGroupChanges implements Task {
  public function run() {
    $failedUserIds = [];

    $stmt = Database::get()->prepare('SELECT `usergroupchangeid` AS `userGroupChangeId`, `userid` AS `userId`, `newusergroupid` AS `newUserGroupId` '
      . 'FROM `usergroupchange` '
      . 'WHERE `processed`=0 ORDER BY `created` ASC');
    $stmt->execute();
    while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
      // Skip failed users to avoid out-of-order execution of user group changes
      if (isset($failedUserIds[$row->userId])) {
        continue;
      }

      $nodes = NodeManager::getUserJobNodesWithUserId($row->userId);
      $someFailed = false;

      foreach ($nodes as $node) {
        try {
          $client = $node->connect();
          $client->updateUserGroupId($row->userId, $row->newUserGroupId);
        } catch (Exception $ex) {
          error_log(sprintf('Failed to set user group id on node %d (%s): %s', $node->nodeId, $node->ip, $ex));
          $someFailed = true;
        }
      }

      if (!$someFailed) {
        Database::get()->prepare('UPDATE `usergroupchange` SET `processed`=:processed WHERE `usergroupchangeid`=:userGroupChangeId')
          ->execute([
            ':processed'          => time(),
            ':userGroupChangeId'  => $row->userGroupChangeId
          ]);
      } else {
        $failedUserIds[$row->userId] = true;
      }
    }

    return 0;
  }
}
