<?php
require_once('lib/Task.php');
require_once('lib/Database.php');
require_once('resources/Node.php');
require_once('resources/Job.php');
require_once('resources/User.php');

class MoveJobToDifferentNode implements Task {
  public function run() {
    if (count($_SERVER['argv']) !== 4) {
      echo "Required arguments: <job-id> <new-node-id>\n";
      return 1;
    }

    $jobId = intval($_SERVER['argv'][2]);
    $newNodeId = intval($_SERVER['argv'][3]);

    $stmt = Database::get()->prepare('SELECT `userid`, `nodeid` FROM `job` WHERE `jobid`=:jobId');
    $stmt->execute([':jobId' => $jobId]);
    $row = $stmt->fetch(PDO::FETCH_OBJ);

    if (!$row) {
      echo "Job not found!\n";
      return 1;
    }

    $oldNodeId = intval($row->nodeid);
    $userId = intval($row->userid);

    echo "Job $jobId belongs to user $userId and currently resides on node $oldNodeId.\n";

    if ($oldNodeId === $newNodeId) {
      echo "Nothing to do!\n";
      return 0;
    }

    $fakeToken = new stdClass;
    $fakeToken->userId = $userId;
    $jobManager = new JobManager($fakeToken);

    echo "Retrieving user details... ";
    $userGroup = (new UserManager($fakeToken))->getGroup();
    $userGroupId = $userGroup->userGroupId;
    echo "User group id: $userGroupId\n";

    echo "Retrieving job from old node... ";
    $job = $jobManager->getJobDetails($jobId);
    if (!$job) {
      echo "Failed to retrieve job!";
      return 1;
    }
    echo "OK\n";

    echo "Retrieving new node... ";
    $node = (new NodeManager($fakeToken))->getNodeByNodeId($newNodeId);
    if (!$node) {
      echo "Failed to retrieve new node: $newNodeId!\n";
      return 1;
    }
    echo "OK\n";

    echo "Creating job on new node... ";
    $thriftJob = $job->toThriftJob($userId, $userGroupId);
    $client = $node->connect();
    $client->createOrUpdateJob($thriftJob);
    echo "OK\n";

    echo "Retrieving old node... ";
    $oldNode = (new NodeManager($fakeToken))->getNodeByNodeId($oldNodeId);
    if (!$oldNode) {
      echo "Failed to retrieve old node: $newNodeId!\n";
      return 1;
    }
    echo "OK\n";

    echo "Disabling job on old node... ";
    if ($thriftJob->metaData->enabled) {
      $thriftJob->metaData->enabled = false;
      $client = $oldNode->connect();
      $client->createOrUpdateJob($thriftJob);
      echo "OK\n";
    } else {
      echo "Already disabled\n";
    }

    echo "Updating job node... ";
    $stmt = Database::get()->prepare('UPDATE `job` SET `nodeid`=:nodeId WHERE `jobid`=:jobId');
    $stmt->execute([':nodeId' => $newNodeId, ':jobId' => $jobId]);
    $row = $stmt->fetch(PDO::FETCH_OBJ);
    echo "OK\n";

    return 0;
  }
}
