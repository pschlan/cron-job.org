<?php
require_once('lib/Database.php');
require_once('lib/ChronosClient.php');

class Node {
  public $nodeId;
  public $ip;
  public $port;

  private $client = null;

  public function connect() {
    if ($this->client === null) {
      $this->client = ChronosClient::connectToNode($this->ip, $this->port);
    }
    return $this->client->client;
  }

  public function disconnect() {
    $this->client = null;
  }
}

class NodeManager {
  private $authToken;

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  public function getUserJobNodes() {
    $nodes = [];

    $stmt = Database::get()->prepare('SELECT `nodeid` AS `nodeId`, `ip`, `port` FROM `node` WHERE `nodeid` IN(SELECT DISTINCT(`nodeid`) FROM `job` WHERE `userid`=:userId)');
    $stmt->setFetchMode(PDO::FETCH_CLASS, Node::class);
    $stmt->execute(array(':userId' => $this->authToken->userId));
    while ($node = $stmt->fetch()) {
      $nodes[intval($node->nodeId)] = $node;
    }

    return $nodes;
  }

  public function getJobNode($jobId) {
    $stmt = Database::get()->prepare('SELECT `nodeid` AS `nodeId`, `ip`, `port` FROM `node` WHERE `nodeid`=(SELECT `nodeid` FROM `job` WHERE `jobid`=:jobId AND `userid`=:userId)');
    $stmt->setFetchMode(PDO::FETCH_CLASS, Node::class);
    $stmt->execute(array(':userId' => $this->authToken->userId, ':jobId' => $jobId));
    return $stmt->fetch();
  }

  public function getNodeForNewJob() {
    $stmt = Database::get()->prepare('SELECT `node`.`nodeid` AS `nodeId`, `node`.`ip` AS `ip`, `node`.`port` AS `port` FROM `node` '
                                      . 'INNER JOIN `usergroupnode` ON `node`.`nodeid`=`usergroupnode`.`nodeid` '
                                      . 'WHERE `usergroupnode`.`usergroupid`=:userGroupId AND `usergroupnode`.`enabled`=1 AND `node`.`enabled`=1 ORDER BY RAND() LIMIT 1');
    $stmt->setFetchMode(PDO::FETCH_CLASS, Node::class);
    $stmt->execute(array(':userGroupId' => $this->authToken->userGroupId));
    return $stmt->fetch();
  }
}
