<?php
require_once('lib/Task.php');
require_once('lib/Database.php');
require_once('resources/Node.php');

class UpdateNodeLoad implements Task {
  const TIME_ONE_DAY = 86400;

  public function run() {
    $jobsByNodeId = [];
    $timestamp = time();

    $stmt = Database::get()->prepare('SELECT '
      . '`nodeid` AS `nodeId`, SUM(`jobs`) AS `jobCount` '
      . 'FROM `nodestats` '
      . 'WHERE `d`=:d AND `m`=:m AND `y`=:y AND ((`h`=:h AND `i`>=:i) OR (`h`>:h))'
      . 'GROUP BY `nodeid`');
    $stmt->setFetchMode(PDO::FETCH_CLASS, StatsEntry::class);
    $stmt->execute([
      ':d' => date('j', $timestamp - self::TIME_ONE_DAY),
      ':m' => date('n', $timestamp - self::TIME_ONE_DAY),
      ':y' => date('Y', $timestamp - self::TIME_ONE_DAY),
      ':h' => date('G', $timestamp),
      ':i' => date('i', $timestamp),
    ]);
    while ($entry = $stmt->fetch(PDO::FETCH_OBJ)) {
      if (!isset($jobsByNodeId[$entry->nodeId])) {
        $jobsByNodeId[$entry->nodeId] = 0;
      }
      $jobsByNodeId[$entry->nodeId] += intval($entry->jobCount);
    }

    $stmt = Database::get()->prepare('SELECT '
    . '`nodeid` AS `nodeId`, SUM(`jobs`) AS `jobCount` '
      . 'FROM `nodestats` '
      . 'WHERE `d`=:d AND `m`=:m AND `y`=:y '
      . 'GROUP BY `nodeid`');
    $stmt->setFetchMode(PDO::FETCH_CLASS, StatsEntry::class);
    $stmt->execute([
      ':d' => date('j', $timestamp),
      ':m' => date('n', $timestamp),
      ':y' => date('Y', $timestamp)
    ]);
    while ($entry = $stmt->fetch(PDO::FETCH_OBJ)) {
      if (!isset($jobsByNodeId[$entry->nodeId])) {
        $jobsByNodeId[$entry->nodeId] = 0;
      }
      $jobsByNodeId[$entry->nodeId] += intval($entry->jobCount);
    }

    $sum = array_reduce($jobsByNodeId, function($sum, $item) {
      return $sum + $item;
    }, 0);

    foreach ($jobsByNodeId as $nodeId => $jobCount) {
      $load = round(($jobCount / $sum) * 100, 0);

      Database::get()->prepare('UPDATE `node` SET `load_24h`=:load24h WHERE `nodeid`=:nodeId')
        ->execute([
          ':load24h'    => $load,
          ':nodeId'     => $nodeId
        ]);
    }

    return 0;
  }
}
