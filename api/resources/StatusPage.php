<?php
require_once('lib/Database.php');
require_once('resources/Job.php');
require_once('resources/User.php');

class InvalidArgumentsException extends Exception {}
class StatusPageMonitorNotFoundException extends Exception {}
class InternalJobUpdateFailed extends Exception {}
class StatusPageJobNotFoundException extends Exception {}
class StatusPageNotFoundException extends Exception {}
class QuotaExceededException extends Exception {}
class DomainNotFoundException extends Exception {}
class DomainAlreadyExistsException extends Exception {}
class StatusPagePublishedException extends Exception {}

class StatusPageMonitor {
  public $monitorId;
  public $position;
  public $monitorTitle;
  public $jobTitle;
  public $jobUrl;
  public $jobId;
  public $enabled;
  public $thresholdUptimeWarning;
  public $thresholdUptimeError;
  public $thresholdLatencyWarning;
  public $thresholdLatencyError;
  public $percentile;

  function __construct() {
    $this->monitorId = intval($this->monitorId);
    $this->position = intval($this->position);
    $this->jobId = intval($this->jobId);
    $this->enabled = boolval($this->enabled);
    $this->thresholdUptimeWarning = doubleval($this->thresholdUptimeWarning);
    $this->thresholdUptimeError = doubleval($this->thresholdUptimeError);
    $this->thresholdLatencyWarning = intval($this->thresholdLatencyWarning);
    $this->thresholdLatencyError = intval($this->thresholdLatencyError);
    $this->percentile = doubleval($this->percentile);
  }
}

class StatusPageDomain {
  public $domain;
  public $deletable = false;
}

class StatusPage {
  public $statusPageId;
  public $title;
  public $enabled;
  public $uniqueId;
  public $domains;
  public $monitors;
  public $logo;
  public $logoMimeType;
  public $maxMonitors;
  public $maxDomains;

  function __construct() {
    global $config;

    $this->statusPageId = intval($this->statusPageId);
    $this->enabled = boolval($this->enabled);

    if (is_string($this->domains)) {
      $this->domains = array_map(function ($domain) {
        $result = new StatusPageDomain();
        $result->domain = $domain;
        $result->deletable = true;
        return $result;
      }, explode(',', $this->domains));
    } else if (!is_array($this->domains)) {
      $this->domains = [];
    }

    if (!empty($this->uniqueId)) {
      $systemDomain = new StatusPageDomain();
      $systemDomain->domain = $this->uniqueId . '.' . $config['statusPageDomain'];
      $systemDomain->deletable = false;
      array_unshift($this->domains, $systemDomain);
    }

    if (!empty($this->logo)) {
      $this->logo = base64_encode($this->logo);
    }

    $this->monitors = [];
  }
}

class StatusPageManager {
  const UNIQUE_ID_CHARS = 'bcdfghjklmnpqrstvwxyz0123456789';

  private $authToken;
  private $jobManager;
  private $userManager;

  function __construct($authToken) {
    $this->authToken = $authToken;
    $this->jobManager = new JobManager($this->authToken);
    $this->userManager = new UserManager($this->authToken);
  }

  public function getStatusPages() {
    global $config;

    $pages = [];

    $stmt = Database::get()->prepare('SELECT `statuspage`.`statuspageid` AS `statusPageId`, `title`, `uniqueid` AS `uniqueId`, `enabled`, GROUP_CONCAT(`domain`) AS `domains` '
      . 'FROM `statuspage` '
      . 'LEFT JOIN `statuspagedomain` ON `statuspagedomain`.`statuspageid`=`statuspage`.`statuspageid` '
      . 'WHERE `userid`=:userId '
      . 'GROUP BY `statuspage`.`statuspageid` '
      . 'ORDER BY `enabled` DESC, `title` ASC');
    $stmt->execute(array(':userId' => $this->authToken->userId));
    while ($statusPage = $stmt->fetch(PDO::FETCH_OBJ)) {
      $statusPage->statusPageId = (int)$statusPage->statusPageId;
      $statusPage->enabled = (int)$statusPage->enabled === 1;
      $statusPage->domains = array_merge([
        $statusPage->uniqueId . '.' . $config['statusPageDomain']
      ], $statusPage->domains ? explode(',', $statusPage->domains) : []);

      $pages[] = $statusPage;
    }

    return (object) [
      'statusPages'     => $pages,
      'maxStatusPages'  => $this->userManager->getGroup()->maxStatusPages
    ];
  }

  public function createStatusPage($title) {
    $statusPages = $this->getStatusPages();
    if (count($statusPages->statusPages) + 1 > $statusPages->maxStatusPages) {
      throw new QuotaExceededException();
    }

    $stmt = Database::get()->prepare('INSERT INTO `statuspage`(`userid`, `title`, `uniqueid`, `enabled`) '
      . 'VALUES(:userId, :title, :uniqueId, 0)');
    $stmt->execute(array(
      ':userId'     => $this->authToken->userId,
      ':title'      => $title,
      ':uniqueId'   => self::generateUniqueId()
    ));
    return (int)Database::get()->insertId();
  }

  public function getStatusPage($statusPageId) {
    $stmt = Database::get()->prepare('SELECT `statuspage`.`statuspageid` AS `statusPageId`, `title`, `uniqueid` AS `uniqueId`, `enabled`, GROUP_CONCAT(`domain`) AS `domains`, `logo`, `statuspagelogo`.`mimetype` AS `logoMimeType` '
      . 'FROM `statuspage` '
      . 'LEFT JOIN `statuspagedomain` ON `statuspagedomain`.`statuspageid`=`statuspage`.`statuspageid` '
      . 'LEFT JOIN `statuspagelogo` ON `statuspagelogo`.`statuspageid`=`statuspage`.`statuspageid` '
      . 'WHERE `statuspage`.`statuspageid`=:statusPageId AND `userid`=:userId');
    $stmt->execute(array(':statusPageId' => $statusPageId, ':userId' => $this->authToken->userId));
    $stmt->setFetchMode(PDO::FETCH_CLASS, StatusPage::class);
    $statusPage = $stmt->fetch();
    if (!$statusPage) {
      return false;
    }

    $userJobs = $this->jobManager->getJobs();
    $userJobsById = [];
    array_walk($userJobs->jobs, function($job) use(&$userJobsById) {
      $userJobsById[intval($job->jobId)] = $job;
    });

    $stmt = Database::get()->prepare('SELECT `statuspagejobid` AS `monitorId`, `statuspagejob`.`position`, `statuspagejob`.`title` AS `monitorTitle`, `statuspagejob`.`jobid` AS `jobId`, `statuspagejob`.`enabled`, `threshold_uptime_warning` AS `thresholdUptimeWarning`, `threshold_uptime_error` AS `thresholdUptimeError`, `threshold_latency_warning` AS `thresholdLatencyWarning`, `threshold_latency_error` AS `thresholdLatencyError`, `percentile` '
      . 'FROM `statuspagejob` '
      . 'INNER JOIN `job` ON `job`.`jobid`=`statuspagejob`.`jobid` '
      . 'WHERE `statuspagejob`.`statuspageid`=:statusPageId AND `job`.`userid`=:userId '
      . 'ORDER BY `position` ASC, `monitorTitle` ASC');
    $stmt->execute(array(':statusPageId' => $statusPageId, ':userId' => $this->authToken->userId));
    $stmt->setFetchMode(PDO::FETCH_CLASS, StatusPageMonitor::class);
    while ($monitor = $stmt->fetch()) {
      if (!isset($userJobsById[$monitor->jobId])) {
        continue;
      }

      $job = $userJobsById[$monitor->jobId];
      $monitor->jobTitle = $job->title;
      $monitor->jobUrl = $job->url;

      $statusPage->monitors[] = $monitor;
    }

    $statusPage->maxMonitors = $this->userManager->getGroup()->maxStatusPageMonitors;
    $statusPage->maxDomains = $this->userManager->getGroup()->maxStatusPageDomains;

    return $statusPage;
  }

  public function updateStatusPage($statusPageId, $statusPage) {
    global $config;

    if (!isset($statusPage->enabled)) {
      throw new InvalidArgumentsException();
    }

    if (!isset($statusPage->title)
        || strlen($statusPage->title) < 3) {
      throw new InvalidArgumentsException();
    }

    if (isset($statusPage->logoMimeType)
        && !empty($statusPage->logoMimeType)
        && !in_array($statusPage->logoMimeType, $config['allowdLogoMimeTypes'])) {
      throw new InvalidArgumentsException();
    }

    $this->checkStatusPagePermission($statusPageId);

    $stmt = Database::get()->prepare('UPDATE `statuspage` '
      . 'SET `title`=:title, `enabled`=:enabled '
      . 'WHERE `statusPageId`=:statusPageId AND `userid`=:userId');
    $stmt->execute([
      ':title'            => $statusPage->title,
      ':enabled'          => $statusPage->enabled ? 1 : 0,
      ':statusPageId'     => $statusPageId,
      ':userId'           => $this->authToken->userId
    ]);

    if (empty($statusPage->logoMimeType) || empty($statusPage->logo)) {
      $stmt = Database::get()->prepare('DELETE FROM `statuspagelogo` WHERE `statuspageid`=:statusPageId');
      $stmt->execute([':statusPageId' => $statusPageId]);
    } else {
      $stmt = Database::get()->prepare('REPLACE INTO `statuspagelogo`(`statuspageid`, `logo`, `mimetype`) VALUES(:statusPageId, :logo, :mimeType)');
      $stmt->execute([
        ':statusPageId'     => $statusPageId,
        ':logo'             => base64_decode($statusPage->logo),
        ':mimeType'         => $statusPage->logoMimeType
      ]);
    }

    return true;
  }

  public function updateStatusPageMonitor($monitorId, $monitor) {
    if (!isset($monitor->percentile)
        || !is_numeric($monitor->percentile)
        || $monitor->percentile < 0.5
        || $monitor->percentile > 1) {
      throw new InvalidArgumentsException();
    }

    if (!isset($monitor->thresholdLatencyWarning)
        || !isset($monitor->thresholdLatencyError)
        || !is_numeric($monitor->thresholdLatencyWarning)
        || !is_numeric($monitor->thresholdLatencyError)) {
      throw new InvalidArgumentsException();
    }

    if (!isset($monitor->thresholdUptimeWarning)
        || !isset($monitor->thresholdUptimeError)
        || !is_numeric($monitor->thresholdUptimeWarning)
        || !is_numeric($monitor->thresholdUptimeError)) {
      throw new InvalidArgumentsException();
    }

    if (!isset($monitor->monitorTitle)
        || strlen($monitor->monitorTitle) < 3) {
      throw new InvalidArgumentsException();
    }

    $this->checkStatusPageMonitorPermission($monitorId);

    $stmt = Database::get()->prepare('UPDATE `statuspagejob` SET '
      . '`enabled`=:enabled, '
      . '`percentile`=:percentile, '
      . '`title`=:title, '
      . '`threshold_latency_warning`=:thresholdLatencyWarning, '
      . '`threshold_latency_error`=:thresholdLatencyError, '
      . '`threshold_uptime_warning`=:thresholdUptimeWarning, '
      . '`threshold_uptime_error`=:thresholdUptimeError '
      . 'WHERE `statuspagejob`.`statuspagejobid`=:statusPageJobId');
    $stmt->execute(array(
      ':statusPageJobId' => $monitorId,
      ':enabled' => $monitor->enabled ? 1 : 0,
      ':percentile' => $monitor->percentile,
      ':title' => $monitor->monitorTitle,
      ':thresholdLatencyWarning' => (double)$monitor->thresholdLatencyWarning,
      ':thresholdLatencyError' => (double)$monitor->thresholdLatencyError,
      ':thresholdUptimeWarning' => (double)$monitor->thresholdUptimeWarning,
      ':thresholdUptimeError' => (double)$monitor->thresholdUptimeError
    ));

    return true;
  }

  public function updateStatusPageMonitorsOrder($statusPageId, $order) {
    foreach ($order as $index => $id) {
      if (!is_numeric($index) || !is_numeric($id)) {
        throw new InvalidArgumentsException();
      }
    }

    $this->checkStatusPagePermission($statusPageId);

    Database::get()->beginTransaction();
    $stmt = Database::get()->prepare('UPDATE `statuspagejob` '
      . 'SET `position`=:position '
      . 'WHERE `statuspageid`=:statusPageId '
      . 'AND `statuspagejobid`=:statusPageJobId');
    foreach ($order as $position => $id) {
      $stmt->execute(array(
        ':position'           => $position,
        ':statusPageId'       => $statusPageId,
        ':statusPageJobId'    => $id
      ));
    }
    Database::get()->commitTransaction();

    return true;
  }

  public function createStatusPageMonitor($statusPageId, $jobId, $title) {
    $statusPage = $this->getStatusPage($statusPageId);
    if (count($statusPage->monitors) + 1 > $statusPage->maxMonitors) {
      throw new QuotaExceededException();
    }

    $this->checkJobPermission($jobId);

    $transactionActive = false;

    try {
      Database::get()->beginTransaction();
      $transactionActive = true;

      $position = 0;

      $stmt = Database::get()->prepare('SELECT MAX(`position`) AS `maxPosition` FROM `statuspagejob` WHERE `statuspageid`=:statusPageId');
      $stmt->execute(array(':statusPageId' => $statusPageId));
      while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
        $position = intval($row->maxPosition) + 1;
      }

      $stmt = Database::get()->prepare('INSERT INTO `statuspagejob`(`statuspageid`, `jobid`, `title`, `position`) '
        . 'VALUES(:statusPageId, :jobId, :title, :position)');
      $stmt->execute(array(
        ':statusPageId' => $statusPageId,
        ':jobId'        => $jobId,
        ':title'        => $title,
        ':position'     => $position
      ));

      if (!$this->setJobMonitorType($jobId, true)) {
        throw new InternalJobUpdateFailed();
      }

      Database::get()->commitTransaction();
      $transactionActive = false;

      return true;
    } catch (Exception $ex) {
      if ($transactionActive) {
        try {
          Database::get()->rollbackTransaction();
        } catch (Exception $ex) { }
      }
      throw $ex;
    }
  }

  public function deleteStatusPage($statusPageId) {
    $statusPage = $this->getStatusPage($statusPageId);
    if ($statusPage->enabled) {
      throw new StatusPagePublishedException();
    }

    foreach ($statusPage->monitors as $monitor) {
      $this->deleteStatusPAgeMonitor($monitor->monitorId);
    }

    Database::get()->beginTransaction();

    $stmt = Database::get()->prepare('DELETE FROM `statuspagedomain` WHERE `statuspageid`=:statusPageId');
    $stmt->execute(array(':statusPageId' => $statusPageId));

    $stmt = Database::get()->prepare('DELETE FROM `statuspagelogo` WHERE `statuspageid`=:statusPageId');
    $stmt->execute(array(':statusPageId' => $statusPageId));

    $stmt = Database::get()->prepare('DELETE FROM `statuspage` WHERE `statuspageid`=:statusPageId AND `userid`=:userId '
      . 'AND (SELECT COUNT(*) FROM `statuspagejob` WHERE `statuspageid`=:statusPageId)=0 '
      . 'AND (SELECT COUNT(*) FROM `statuspagedomain` WHERE `statuspageid`=:statusPageId)=0 '
      . 'AND (SELECT COUNT(*) FROM `statuspagelogo` WHERE `statuspageid`=:statusPageId)=0 ');
    $stmt->execute(array(':statusPageId' => $statusPageId, ':userId' => $this->authToken->userId));

    Database::get()->commitTransaction();

    return true;
  }

  public function deleteStatusPageMonitor($monitorId) {
    $jobId = $this->getStatusPageMonitorJobId($monitorId);

    $transactionActive = false;

    try {
      Database::get()->beginTransaction();
      $transactionActive = true;

      $stmt = Database::get()->prepare('DELETE FROM `statuspagejob` WHERE `statuspagejobid`=:statusPageJobId');
      $stmt->execute(array(':statusPageJobId' => $monitorId));

      $stmt = Database::get()->prepare('SELECT COUNT(*) AS `count` FROM `statuspagejob` WHERE `jobid`=:jobId');
      $stmt->execute(array(':jobId' => $jobId));
      $result = $stmt->fetch(PDO::FETCH_OBJ);

      if ((int)$result->count === 0) {
        if (!$this->setJobMonitorType($jobId, false)) {
          throw new InternalJobUpdateFailed();
        }
      }

      Database::get()->commitTransaction();
      $transactionActive = false;

      return true;
    } catch (Exception $ex) {
      if ($transactionActive) {
        try {
          Database::get()->rollbackTransaction();
        } catch (Exception $ex) { }
      }
      throw $ex;
    }
  }

  public function deleteStatusPageDomain($statusPageId, $domain) {
    $this->checkStatusPagePermission($statusPageId);

    $stmt = Database::get()->prepare('DELETE FROM `statuspagedomain` '
      . 'WHERE `statuspageid`=:statusPageId '
      . 'AND `domain`=:domain');
    $stmt->execute(array(':statusPageId' => $statusPageId, ':domain' => $domain));

    if ($stmt->rowCount() != 1) {
      throw new DomainNotFoundException();
    }

    return true;
  }

  public function createStatusPageDomain($statusPageId, $domain) {
    global $config;

    $domain = trim($domain);

    if (!preg_match('/^([a-zA-Z0-9][a-zA-Z0-9-]*)(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/', $domain)) {
      throw new InvalidArgumentsException();
    }

    if (strlen($domain) >= strlen($config['statusPageDomain'])
        && strtolower(substr($domain, -strlen($config['statusPageDomain']))) === strtolower($config['statusPageDomain'])) {
      throw new DomainAlreadyExistsException();
    }

    $statusPage = $this->getStatusPage($statusPageId);
    if (count($statusPage->domains) + 1 > $statusPage->maxDomains) {
      throw new QuotaExceededException();
    }

    try {
      $stmt = Database::get()->prepare('INSERT INTO `statuspagedomain`(`statuspageid`, `domain`) '
        . 'VALUES(:statusPageId, :domain)');
      $stmt->execute(array(':statusPageId' => $statusPageId, ':domain' => $domain));
    } catch (PDOException $ex) {
      if (intval($ex->getCode()) === 23000) {
        throw new DomainAlreadyExistsException();
      }
      throw $ex;
    }

    return true;
  }

  private function setJobMonitorType($jobId, $isMonitorType) {
    $jobDetails = $this->jobManager->getJobDetails($jobId);
    if (!$jobDetails) {
      return false;
    }

    $jobDetails->type = $isMonitorType ? \chronos\JobType::MONITORING : \chronos\JobType::DEFAULT;

    if (!$this->jobManager->updateJob($jobDetails)) {
      return false;
    }

    return true;
  }

  private function checkStatusPagePermission($statusPageId) {
    $stmt = Database::get()->prepare('SELECT COUNT(*) AS `count` FROM `statuspage` '
      . 'WHERE `statuspageid`=:statusPageId '
      . 'AND `statuspage`.`userid`=:userId');
    $stmt->execute(array(':statusPageId' => $statusPageId, ':userId' => $this->authToken->userId));
    $result = $stmt->fetch(PDO::FETCH_OBJ);
    if (!$result || intval($result->count) !== 1) {
      throw new StatusPageNotFoundException();
    }
  }

  private function checkStatusPageMonitorPermission($monitorId) {
    $this->getStatusPageMonitorJobId($monitorId);
  }

  private function getStatusPageMonitorJobId($monitorId) {
    $stmt = Database::get()->prepare('SELECT `jobid` AS `jobId` FROM `statuspagejob` '
      . 'INNER JOIN `statuspage` ON `statuspage`.`statuspageid`=`statuspagejob`.`statuspageid` '
      . 'WHERE `statuspagejob`.`statuspagejobid`=:statusPageJobId '
      . 'AND `statuspage`.`userid`=:userId');
    $stmt->execute(array(':statusPageJobId' => $monitorId, ':userId' => $this->authToken->userId));
    $result = $stmt->fetch(PDO::FETCH_OBJ);
    if (!$result) {
      throw new StatusPageMonitorNotFoundException();
    }
    return $result->jobId;
  }

  private function checkJobPermission($jobId) {
    if ($this->jobManager->getJobDetails($jobId) === false) {
      throw new StatusPageJobNotFoundException();
    }
  }

  private static function generateUniqueId() {
    global $config;

    $result = '';
    for ($i = 0; $i < $config['statusPageUniqueIdLength']; ++$i) {
      $result .= self::UNIQUE_ID_CHARS[ mt_rand(0, strlen(self::UNIQUE_ID_CHARS)-1) ];
    }
    return $result;
  }
}
