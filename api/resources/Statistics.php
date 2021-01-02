<?php
require_once('lib/Database.php');
require_once('resources/User.php');

class StatsEntry {
  private $d;
  private $m;
  private $y;
  private $h;
  private $i;
  public $sumExecutions;
  public $averageJitter;
  public $timestamp;

  function __construct() {
    $this->d = intval($this->d);
    $this->m = intval($this->m);
    $this->y = intval($this->y);
    $this->h = intval($this->h);
    $this->i = intval($this->i);
    $this->sumExecutions = intval($this->sumExecutions);
    $this->averageJitter = doubleval($this->averageJitter);
    $this->timestamp = gmmktime($this->h, $this->i, 0, $this->m, $this->d, $this->y);
  }

  function getTimestamp() {
    return $this->timestamp;
  }
}

class StatisticsManager {
  private $authToken;
  private const TIME_ONE_DAY = 86400;
  private const PERCENTILE = 0.995;

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  public function getServiceExecutionStatsForLast24Hours($timestamp) {
    $result = [];

    $stmt = Database::get()->prepare('SELECT '
      . '`d`, `m`, `y`, `h`, `i`, SUM(`jobs`) AS `sumExecutions`, SUM(`jitter`*`jobs`)/SUM(`jobs`) AS `averageJitter` '
      . 'FROM `nodestats` '
      . 'WHERE `d`=:d AND `m`=:m AND `y`=:y AND ((`h`=:h AND `i`>=:i) OR (`h`>:h))'
      . 'GROUP BY `d`, `m`, `y`, `h`, `i` ');
    $stmt->setFetchMode(PDO::FETCH_CLASS, StatsEntry::class);
    $stmt->execute([
      ':d' => date('j', $timestamp - self::TIME_ONE_DAY),
      ':m' => date('n', $timestamp - self::TIME_ONE_DAY),
      ':y' => date('Y', $timestamp - self::TIME_ONE_DAY),
      ':h' => date('G', $timestamp),
      ':i' => date('i', $timestamp),
    ]);
    while ($entry = $stmt->fetch()) {
      $result[] = $entry;
    }

    $stmt = Database::get()->prepare('SELECT '
      . '`d`, `m`, `y`, `h`, `i`, SUM(`jobs`) AS `sumExecutions`, SUM(`jitter`*`jobs`)/SUM(`jobs`) AS `averageJitter` '
      . 'FROM `nodestats` '
      . 'WHERE `d`=:d AND `m`=:m AND `y`=:y '
      . 'GROUP BY `d`, `m`, `y`, `h`, `i`');
    $stmt->setFetchMode(PDO::FETCH_CLASS, StatsEntry::class);
    $stmt->execute([
      ':d' => date('j', $timestamp),
      ':m' => date('n', $timestamp),
      ':y' => date('Y', $timestamp)
    ]);
    while ($entry = $stmt->fetch()) {
      $result[] = $entry;
    }

    usort($result, function($a, $b) {
      return $a->getTimestamp() - $b->getTimestamp();
    });

    $last24Hours = array_sum(array_map(function ($entry) {
      return $entry->sumExecutions;
    }, $result));

    return (object)[
      'samples' => $this->downsampleExecutionStats($result),
      'last24Hours' => $last24Hours
    ];
  }

  public function getCommonStats() {
    $result = new stdClass;

    $stmt = Database::get()->prepare('SELECT `TABLE_NAME`, `TABLE_ROWS` FROM `INFORMATION_SCHEMA`.`TABLES` WHERE `TABLE_NAME` IN (:jobTable)');
    $stmt->execute([
      ':jobTable'   => 'job'
    ]);
    while ($entry = $stmt->fetch(PDO::FETCH_ASSOC)) {
      switch ($entry['TABLE_NAME']) {
      case 'job':
        $result->numJobs = intval($entry['TABLE_ROWS']);
        break;
      default:
        break;
      }
    }

    $stmt = Database::get()->prepare('SELECT COUNT(*) AS `numUsers` FROM `user` WHERE `status` = :status');
    $stmt->execute([
      ':status'   => UserProfile::STATUS_VERIFIED
    ]);
    while ($entry = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $result->numUsers = intval($entry['numUsers']);
    }

    return $result;
  }

  private function downsampleExecutionStats($in, $minutes = 60) {
    $aggregate = [];

    foreach ($in as $entry) {
      $entry->timestamp = intval(floor($entry->timestamp / ($minutes * 60))) * ($minutes * 60);

      $key = $entry->timestamp;
      if (!isset($aggregate[$key])) {
        $aggregate[$key] = [ $entry ];
      } else {
        $aggregate[$key][] = $entry;
      }
    }

    $result = [];
    foreach ($aggregate as $entries) {
      $entry = $entries[0];

      if (count($entries) != $minutes) {
        continue;
      }

      $entry->sumExecutions = round($this->calculateAverage(array_map(function ($entry) {
        return $entry->sumExecutions;
      }, $entries)), 0);
      $entry->averageJitter = round($this->calculateAverage(array_map(function ($entry) {
        return $entry->averageJitter;
      }, $entries)), 0);

      $result[] = $entry;
    }

    return $result;
  }

  private function calculateAverage($values) {
    return array_sum($values) / count($values);
  }

  private function calculatePercentile($values, $p = 0.99) {
    if (count($values) === 1) {
      return $values[0];
    }

    sort($values);

    $rank = max(0, count($values) * $p - 1);

    $index1 = floor($rank);
    if (abs($index1 - $rank) < 10e-6) {
      return $values[$rank];
    }

    $index2 = ceil($rank);

    $value1 = $values[$index1];
    $value2 = $values[$index2];

    $frac = $rank - floor($rank);

    return $value1 + ($value2 - $value1) * $frac;
  }
}
