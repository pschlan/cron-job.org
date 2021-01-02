<?php
require_once('lib/Database.php');
require_once('resources/Job.php');
require_once('resources/Node.php');

class PublicStatusPageManager {
  public function mayRequestCertificate($domain) {
    $uniqueId = self::parseStatusPageSubdomain($domain);

    if ($uniqueId !== false) {
      //! @note These will be handled by the wildcard certificate, so no need to request a separate one.
      return false;
    }

    $stmt = Database::get()->prepare('SELECT COUNT(*) AS `count` '
      . 'FROM `statuspage` '
      . 'INNER JOIN `statuspagedomain` ON `statuspage`.`statuspageid`=`statuspagedomain`.`statuspageid` '
      . 'WHERE `statuspagedomain`.`domain`=:domain AND `statuspage`.`enabled`=1');
    $stmt->execute([
      ':domain'         => $domain
    ]);
    $result = $stmt->fetch(PDO::FETCH_OBJ);
    return ($result->count > 0);
  }

  public function getStatusPage($domain) {
    $uniqueId = self::parseStatusPageSubdomain($domain);

    $selectClause = 'SELECT `statuspage`.`statuspageid` AS `statusPageId`, `statuspage`.`title` AS `title`, `statuspage`.`userid` AS `userId`, `logo`, `statuspagelogo`.`mimetype` AS `logoMimeType` '
      . 'FROM `statuspage` '
      . 'LEFT JOIN `statuspagelogo` ON `statuspagelogo`.`statuspageid`=`statuspage`.`statuspageid`';

    if ($uniqueId !== false) {
      $stmt = Database::get()->prepare($selectClause
        . 'WHERE `uniqueid`=:uniqueId AND `enabled`=1');
      $stmt->execute([
        ':uniqueId'       => $uniqueId
      ]);
    } else {
      $stmt = Database::get()->prepare($selectClause
        . 'INNER JOIN `statuspagedomain` ON `statuspage`.`statuspageid`=`statuspagedomain`.`statuspageid` '
        . 'WHERE `statuspagedomain`.`domain`=:domain AND `statuspage`.`enabled`=1');
      $stmt->execute([
        ':domain'         => $domain
      ]);
    }

    $statusPageMeta = $stmt->fetch(PDO::FETCH_OBJ);
    if (!$statusPageMeta) {
      return false;
    }

    $statusPageMonitors = [];

    $mapFunction = function ($entry) {
      return [ $entry->date, $entry->duration, $entry->uptimeCounter, $entry->uptimeDenominator ];
    };

    $stmt = Database::get()->prepare('SELECT `statuspagejob`.`title` AS `title`, `statuspagejob`.`jobid` AS `jobId`, `statuspagejob`.`threshold_uptime_warning` AS `thresholdUptimeWarning`, `statuspagejob`.`threshold_uptime_error` AS `thresholdUptimeError`, `statuspagejob`.`threshold_latency_warning` AS `thresholdLatencyWarning`, `statuspagejob`.`threshold_latency_error` AS `thresholdLatencyError`, `statuspagejob`.`percentile` AS `percentile`, `node`.`nodeid` AS `nodeId`, `node`.`ip` AS `ip`, `node`.`port` AS `port` '
      . 'FROM `statuspagejob` '
      . 'INNER JOIN `job` ON `job`.`jobid`=`statuspagejob`.`jobid` '
      . 'INNER JOIN `node` ON `node`.`nodeid`=`job`.`nodeid` '
      . 'WHERE `statuspagejob`.`statuspageid`=:statusPageId AND `statuspagejob`.`enabled`=1 '
      . 'ORDER BY `statuspagejob`.`position` ASC, `statuspagejob`.`title` ASC');
    $stmt->execute([
      ':statusPageId'   => $statusPageMeta->statusPageId
    ]);
    while ($statusPageJob = $stmt->fetch(PDO::FETCH_OBJ)) {
      $node = new Node();
      $node->nodeId = $statusPageJob->nodeId;
      $node->ip = $statusPageJob->ip;
      $node->port = $statusPageJob->port;

      $timeSeriesData = (object) [];

      try {
        $client = $node->connect();

        $timeSeriesData = $client->getTimeSeriesData(Job::createIdentifier($statusPageJob->jobId, $statusPageMeta->userId), $statusPageJob->percentile);
        $timeSeriesData->last12Months = array_map($mapFunction, $timeSeriesData->last12Months);
        $timeSeriesData->last24Hours = array_map($mapFunction, $timeSeriesData->last24Hours);
      } catch (Exception $ex) {
        error_log('Exception while retrieving time series data: ' . (string)$ex);
        continue;
      }

      $statusPageMonitors[] = (object) [
        'title'             => $statusPageJob->title,
        'thresholds'        => (object) [
          'uptime'          => (object) [
            'error'         => (double)$statusPageJob->thresholdUptimeError,
            'warning'       => (double)$statusPageJob->thresholdUptimeWarning
          ],
          'latency'         => (object) [
            'error'         => (double)$statusPageJob->thresholdLatencyError,
            'warning'       => (double)$statusPageJob->thresholdLatencyWarning
          ]
        ],
        'percentile'        => (double)$statusPageJob->percentile,
        'timeSeriesData'    => $timeSeriesData
      ];
    }

    unset($statusPageMeta->statusPageId);

    return (object) [
      'statusPageMeta'      => (object) [
        'title'             => $statusPageMeta->title,
        'logo'              => $statusPageMeta->logo !== null ? (object) [
          'data'            => base64_encode($statusPageMeta->logo),
          'mimeType'        => $statusPageMeta->logoMimeType
        ] : null
      ],
      'statusPageMonitors'  => $statusPageMonitors
    ];
  }

  private static function parseStatusPageSubdomain($domain) {
    global $config;
    if (strlen($domain) > strlen($config['statusPageDomain'])
        && strcasecmp(substr($domain, -(strlen($config['statusPageDomain']) + 1)), '.' . $config['statusPageDomain']) === 0) {
      return strtolower(substr($domain, 0, -(strlen($config['statusPageDomain']) + 1)));
    }
    return false;
  }
}
