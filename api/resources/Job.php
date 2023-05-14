<?php
require_once('lib/Database.php');
require_once('lib/ChronosClient.php');
require_once('lib/ExecutionPredictor.php');
require_once('lib/RedisConnection.php');
require_once('lib/Exceptions.php');
require_once('resources/User.php');
require_once('Node.php');

class CannotDeleteMonitorJobException extends Exception {}

class JobSchedule {
  public $timezone;
  public $hours = [];
  public $mdays = [];
  public $minutes = [];
  public $months = [];
  public $wdays = [];
  public $expiresAt;
}

class JobNotification {
  public $onFailure = false;
  public $onSuccess = false;
  public $onDisable = false;
}

class JobAuthentication {
  public $enable = false;
  public $user = '';
  public $password = '';
}

class JobExtendedData {
  public $headers = [];
  public $body = '';
}

class Job {
  public $jobId;
  public $enabled;
  public $title;
  public $saveResponses;
  public $url;
  public $lastStatus;
  public $lastDuration;
  public $lastExecution;
  public $nextExecution;

  public $auth;
  public $notification;
  public $extendedData;

  public $type;
  public $requestTimeout;
  public $redirectSuccess;
  public $folderId;

  private $node;

  function __construct() {
    $this->auth         = new JobAuthentication;
    $this->notification = new JobNotification;
    $this->schedule     = new JobSchedule;
    $this->extendedData = new JobExtendedData;
  }

  public static function fromThriftJob($job, $node) {
    $result = new Job;

    $result->jobId            = $job->identifier->jobId;
    $result->enabled          = $job->metaData->enabled;
    $result->title            = $job->metaData->title;
    $result->saveResponses    = $job->metaData->saveResponses;
    $result->type             = $job->metaData->type;
    $result->requestTimeout   = $job->metaData->requestTimeout;
    $result->redirectSuccess  = $job->metaData->redirectSuccess;
    $result->folderId         = $job->metaData->folderId;
    $result->url              = $job->data->url;
    $result->requestMethod    = $job->data->requestMethod;

    if (isset($job->executionInfo)) {
      $result->lastStatus     = $job->executionInfo->lastStatus;
      $result->lastDuration   = $job->executionInfo->lastDuration;
      $result->lastExecution  = $job->executionInfo->lastFetch;
    }

    if (isset($job->authentication)) {
      $result->auth->enable   = $job->authentication->enable;
      $result->auth->user     = $job->authentication->user;
      $result->auth->password = $job->authentication->password;
    } else {
      unset($result->auth);
    }

    if (isset($job->notification)) {
      $result->notification->onSuccess  = $job->notification->onSuccess;
      $result->notification->onFailure  = $job->notification->onFailure;
      $result->notification->onDisable  = $job->notification->onDisable;
    } else {
      unset($result->notification);
    }

    if (isset($job->schedule)) {
      $result->schedule->timezone   = $job->schedule->timezone;
      $result->schedule->hours      = array_keys($job->schedule->hours);
      $result->schedule->mdays      = array_keys($job->schedule->mdays);
      $result->schedule->minutes    = array_keys($job->schedule->minutes);
      $result->schedule->months     = array_keys($job->schedule->months);
      $result->schedule->wdays      = array_keys($job->schedule->wdays);
      $result->schedule->expiresAt  = $job->schedule->expiresAt;
    } else {
      unset($result->schedule);
    }

    if (isset($job->extendedData)) {
      $result->extendedData->headers  = $job->extendedData->headers;
      $result->extendedData->body     = $job->extendedData->body;
    } else {
      unset($result->extendedData);
    }

    $result->node             = $node;

    $predictor = new ExecutionPredictor(
      $job->schedule->timezone,
      array_keys($job->schedule->months),
      array_keys($job->schedule->mdays),
      array_keys($job->schedule->wdays),
      array_keys($job->schedule->hours),
      array_keys($job->schedule->minutes),
      $job->schedule->expiresAt
    );
    $result->nextExecution  = $predictor->predictNextExecution(null);
    if ($result->nextExecution === false) {
      $result->nextExecution = null;
    }

    return $result;
  }

  public function toThriftJob($userId, $userGroupId) {
    $job = new \chronos\Job;

    $job->identifier                = self::createIdentifier($this->jobId, $userId);

    $job->metaData                  = new \chronos\JobMetadata;
    $job->metaData->enabled         = $this->enabled;
    $job->metaData->title           = $this->title;
    $job->metaData->saveResponses   = $this->saveResponses;
    $job->metaData->type            = $this->type;
    $job->metaData->userGroupId     = $userGroupId;
    $job->metaData->requestTimeout  = $this->requestTimeout;
    $job->metaData->redirectSuccess = $this->redirectSuccess;
    $job->metaData->folderId        = $this->folderId;

    $job->data                      = new \chronos\JobData;
    $job->data->url                 = $this->url;
    $job->data->requestMethod       = min(max(array_keys(\chronos\RequestMethod::$__names)), max(0, $this->requestMethod));

    $job->authentication            = new \chronos\JobAuthentication;
    $job->authentication->enable    = $this->auth->enable;
    $job->authentication->user      = $this->auth->user;
    $job->authentication->password  = $this->auth->password;

    $job->notification              = new \chronos\JobNotification;
    $job->notification->onDisable   = $this->notification->onDisable;
    $job->notification->onSuccess   = $this->notification->onSuccess;
    $job->notification->onFailure   = $this->notification->onFailure;

    $job->schedule                  = new \chronos\JobSchedule;
    $job->schedule->hours           = $this->toThriftSet($this->schedule->hours,    0,  23);
    $job->schedule->mdays           = $this->toThriftSet($this->schedule->mdays,    1,  31);
    $job->schedule->minutes         = $this->toThriftSet($this->schedule->minutes,  0,  59);
    $job->schedule->months          = $this->toThriftSet($this->schedule->months,   1,  12);
    $job->schedule->wdays           = $this->toThriftSet($this->schedule->wdays,    0,  6);
    $job->schedule->timezone        = $this->schedule->timezone;
    $job->schedule->expiresAt       = $this->schedule->expiresAt;

    $job->extendedData              = new \chronos\JobExtendedData;
    $job->extendedData->headers     = $this->extendedData->headers;
    $job->extendedData->body        = $this->extendedData->body;

    return $job;
  }

  public function updateFromRequest($request) {
    $this->enabled                    = !!$request->job->enabled;
    $this->title                      = empty($request->job->title) ? '' : trim($request->job->title);
    $this->saveResponses              = !!$request->job->saveResponses;

    if (isset($request->job->requestTimeout)) {
      $this->requestTimeout           = intval($request->job->requestTimeout);
    }

    if (isset($request->job->redirectSuccess)) {
      $this->redirectSuccess          = boolval($request->job->redirectSuccess);
    }

    if (isset($request->job->folderId)) {
      $this->folderId                 = intval($request->job->folderId);
    }

    $this->auth->enable               = !!$request->job->auth->enable;
    $this->auth->user                 = (string)$request->job->auth->user;
    $this->auth->password             = (string)$request->job->auth->password;

    $this->notification->onFailure    = !!$request->job->notification->onFailure;
    $this->notification->onSuccess    = !!$request->job->notification->onSuccess;
    $this->notification->onDisable    = !!$request->job->notification->onDisable;

    $this->url                        = trim($request->job->url);
    $this->requestMethod              = (int)$request->job->requestMethod;

    $this->extendedData->body         = (string)$request->job->extendedData->body;

    $this->extendedData->headers      = array();
    foreach ((array)$request->job->extendedData->headers as $key => $value) {
      $key = trim(str_replace(array("\r", "\n"), '', $key));
      if (empty($key)) {
        continue;
      }
      $this->extendedData->headers[$key] = $value;
    }

    $timezone = trim($request->job->schedule->timezone);
    if (in_array($timezone, DateTimeZone::listIdentifiers())) {
      $this->schedule->timezone       = $timezone;
    }

    if (isset($request->job->schedule->expiresAt)) {
      $this->schedule->expiresAt      = $request->job->schedule->expiresAt;
    } else {
      $this->schedule->expiresAt      = 0;
    }
    $this->schedule->hours            = $request->job->schedule->hours;
    $this->schedule->mdays            = $request->job->schedule->mdays;
    $this->schedule->minutes          = $request->job->schedule->minutes;
    $this->schedule->months           = $request->job->schedule->months;
    $this->schedule->wdays            = $request->job->schedule->wdays;
  }

  public function patchFromRequest($request) {
    if (isset($request->job->enabled)) {
      $this->enabled                    = !!$request->job->enabled;
    }

    if (isset($request->job->title)) {
      $this->title                      = empty($request->job->title) ? '' : trim($request->job->title);
    }

    if (isset($request->job->saveResponses)) {
      $this->saveResponses              = !!$request->job->saveResponses;
    }

    if (isset($request->job->requestTimeout)) {
      $this->requestTimeout             = intval($request->job->requestTimeout);
    }

    if (isset($request->job->redirectSuccess)) {
      $this->redirectSuccess            = intval($request->job->redirectSuccess);
    }

    if (isset($request->job->folderId)) {
      $this->folderId                   = intval($request->job->folderId);
    }

    if (isset($request->job->auth) && isset($request->job->auth->enable)) {
      $this->auth->enable               = !!$request->job->auth->enable;
    }

    if (isset($request->job->auth) && isset($request->job->auth->user)) {
      $this->auth->user                 = (string)$request->job->auth->user;
    }

    if (isset($request->job->auth) && isset($request->job->auth->password)) {
      $this->auth->password             = (string)$request->job->auth->password;
    }

    if (isset($request->job->notification) && isset($request->notification->onFailure)) {
      $this->notification->onFailure    = !!$request->job->notification->onFailure;
    }

    if (isset($request->job->notification) && isset($request->notification->onSuccess)) {
      $this->notification->onSuccess    = !!$request->job->notification->onSuccess;
    }

    if (isset($request->job->notification) && isset($request->notification->onDisable)) {
      $this->notification->onDisable    = !!$request->job->notification->onDisable;
    }

    if (isset($request->job->url)) {
      $this->url                        = trim($request->job->url);
    }

    if (isset($request->job->requestMethod)) {
      $this->requestMethod              = (int)$request->job->requestMethod;
    }

    if (isset($request->job->extendedData) && isset($request->job->extendedData->body)) {
      $this->extendedData->body         = (string)$request->job->extendedData->body;
    }

    if (isset($request->job->extendedData) && isset($request->job->extendedData->headers)) {
      $this->extendedData->headers      = array();
      foreach ((array)$request->job->extendedData->headers as $key => $value) {
        $key = trim(str_replace(array("\r", "\n"), '', $key));
        if (empty($key)) {
          continue;
        }
        $this->extendedData->headers[$key] = $value;
      }
    }

    if (isset($request->job->schedule) && isset($request->job->schedule->timezone)) {
      $timezone = trim($request->job->schedule->timezone);

      if (in_array($timezone, DateTimeZone::listIdentifiers())) {
        $this->schedule->timezone       = $timezone;
      }
    }

    if (isset($request->job->schedule) && isset($request->job->schedule->expiresAt)) {
      $this->schedule->expiresAt        = $request->job->schedule->expiresAt;
    }
    if (isset($request->job->schedule) && isset($request->job->schedule->hours)) {
      $this->schedule->hours            = $request->job->schedule->hours;
    }
    if (isset($request->job->schedule) && isset($request->job->schedule->mdays)) {
      $this->schedule->mdays            = $request->job->schedule->mdays;
    }
    if (isset($request->job->schedule) && isset($request->job->schedule->minutes)) {
      $this->schedule->minutes          = $request->job->schedule->minutes;
    }
    if (isset($request->job->schedule) && isset($request->job->schedule->months)) {
      $this->schedule->months           = $request->job->schedule->months;
    }
    if (isset($request->job->schedule) && isset($request->job->schedule->wdays)) {
      $this->schedule->wdays            = $request->job->schedule->wdays;
    }
  }

  public static function createIdentifier($jobId, $userId) {
    $identifier = new \chronos\JobIdentifier;
    $identifier->jobId  = $jobId;
    $identifier->userId = $userId;
    return $identifier;
  }

  private function toThriftSet($array, $min, $max) {
    if (in_array(-1, $array)) {
      return array(-1 => 1);
    }

    $result = array();
    foreach ($array as $key => $value) {
      $result[min($max, max($min, $value))] = 1;
    }
    return $result;
  }
}

class JobManager {
  private $authToken;

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  public function getJobs() {
    $jobs = [];

    $nodes = (new NodeManager($this->authToken))->getUserJobNodes();
    $someFailed = false;

    foreach ($nodes as $node) {
      try {
        $client = $node->connect();

        $nodeJobs = $client->getJobsForUser($this->authToken->userId);
        foreach ($nodeJobs as $nodeJob) {
          $jobs[] = Job::fromThriftJob($nodeJob, $node);
        }
      } catch (Exception $ex) {
        $someFailed = true;
      }
    }

    $keys = array_keys($jobs);
    array_multisort(
      array_column($jobs, 'enabled'), SORT_DESC, SORT_NUMERIC,
      array_column($jobs, 'lastStatus'), SORT_ASC, SORT_NUMERIC,
      array_column($jobs, 'url'), SORT_ASC, SORT_STRING,
      $jobs, $keys
    );

    return (object) [
      'jobs' => $jobs,
      'someFailed' => $someFailed
    ];
  }

  public function getJobDetails($jobId) {
    $node = (new NodeManager($this->authToken))->getJobNode($jobId);
    if (!$node) {
      return false;
    }

    try {
      $client = $node->connect();
      return Job::fromThriftJob($client->getJobDetails(Job::createIdentifier($jobId, $this->authToken->userId)), $node);
    } catch (Exception $ex) {
      return false;
    }
  }

  public function executeMassAction($jobIds, $action, $args) {
    $result = true;

    foreach ($jobIds as $jobId) {
      if ($action === 'delete') {
        try {
          if (!$this->deleteJob($jobId)) {
            $result = false;
          }
        } catch (Exception $ex) {
          $result = false;
        }

      } else {
        $job = $this->getJobDetails($jobId);
        if (!$job) {
          $result = false;
          continue;
        }

        if ($action === 'enable') {
          $job->enabled = true;
        } else if ($action === 'disable') {
          $job->enabled = false;
        } else if ($action === 'move') {
          $job->folderId = $args->folderId;
        }

        if (!$this->updateJob($job)) {
          $result = false;
        }
      }

    }

    return $result;
  }

  public function submitJobTestRun($jobId, $job, $xForwardedFor) {
    global $config;

    $node = null;

    if ($jobId === -1) {
      $node = (new NodeManager($this->authToken))->getNodeForNewJob();
    } else {
      $node = (new NodeManager($this->authToken))->getJobNode($jobId);
    }

    if ($node === null) {
      throw new InternalErrorException();
    }

    $redis = RedisConnection::get();
    if ($redis === null) {
      throw new InternalErrorException();
    }

    $userGroupId = (new UserManager($this->authToken))->getGroup()->userGroupId;

    try {
      $client = $node->connect();

      $handle = $client->submitJobTestRun($job->toThriftJob($this->authToken->userId, $userGroupId), $xForwardedFor);
      if ($handle) {
        $redis->set(implode(':', ['testRun', $handle, 'nodeId']), $node->nodeId, $config['testRunLifetime']);
        return $handle;
      } else {
        throw new InternalErrorException();
      }
    } catch (Exception $ex) {
      throw new InternalErrorException($ex);
    }
  }

  public function getJobTestRunStatus($handle) {
    $redis = RedisConnection::get();
    if ($redis === null) {
      throw new InternalErrorException();
    }

    $nodeId = $redis->get(implode(':', ['testRun', $handle, 'nodeId']));
    if ($nodeId === false) {
      throw new InvalidArgumentsException();
    }

    $node = (new NodeManager($this->authToken))->getNode(intval($nodeId));
    if (!$node) {
      throw new InternalErrorException();
    }

    try {
      $client = $node->connect();

      return $client->getJobTestRunStatus($handle);
    } catch (Exception $ex) {
      throw new InternalErrorException($ex);
    }
  }

  public function deleteJobTestRun($handle) {
    $redis = RedisConnection::get();
    if ($redis === null) {
      throw new InternalErrorException();
    }

    $nodeId = $redis->get(implode(':', ['testRun', $handle, 'nodeId']));
    if ($nodeId === false) {
      throw new InvalidArgumentsException();
    }

    $node = (new NodeManager($this->authToken))->getNode(intval($nodeId));
    if (!$node) {
      throw new InternalErrorException();
    }

    try {
      $client = $node->connect();

      return $client->deleteJobTestRun($handle);
    } catch (Exception $ex) {
      throw new InternalErrorException($ex);
    }
  }

  //! @todo Check job URL for >/dev/null, blacklist etc
  public function updateJob($job) {
    $node = (new NodeManager($this->authToken))->getJobNode($job->jobId);
    if (!$node) {
      return false;
    }

    $userGroupId = (new UserManager($this->authToken))->getGroup()->userGroupId;

    try {
      $client = $node->connect();

      $client->createOrUpdateJob($job->toThriftJob($this->authToken->userId, $userGroupId));

      return true;
    } catch (Exception $ex) {
      return false;
    }
  }

  //! @todo Check job URL for >/dev/null, blacklist etc
  public function createJob($job) {
    $node = (new NodeManager($this->authToken))->getNodeForNewJob();
    if (!$node) {
      return false;
    }

    $userGroupId = (new UserManager($this->authToken))->getGroup()->userGroupId;

    $transactionActive = false;

    try {
      $client = $node->connect();

      Database::get()->beginTransaction();
      $transactionActive = true;

      Database::get()
        ->prepare('INSERT INTO `job`(`userid`,`nodeid`) VALUES(:userId, :nodeId)')
        ->execute(array('userId' => $this->authToken->userId, 'nodeId' => $node->nodeId));

      $job->jobId = Database::get()->insertId();
      $client->createOrUpdateJob($job->toThriftJob($this->authToken->userId, $userGroupId));

      Database::get()->commitTransaction();
      $transactionActive = false;

      return (int)$job->jobId;
    } catch (Exception $ex) {
      if ($transactionActive) {
        try {
          Database::get()->rollbackTransaction();
        } catch (Exception $ex) { }
      }
      return false;
    }
  }

  public function deleteJob($jobId) {
    $node = (new NodeManager($this->authToken))->getJobNode($jobId);
    if (!$node) {
      return false;
    }

    try {
      $client = $node->connect();

      $job = Job::fromThriftJob($client->getJobDetails(Job::createIdentifier($jobId, $this->authToken->userId)), $node);
      if ($job->type === \chronos\JobType::MONITORING) {
        throw new CannotDeleteMonitorJobException();
      }

      $client->deleteJob(Job::createIdentifier($jobId, $this->authToken->userId));

      $stmt = Database::get()->prepare('DELETE FROM `job` WHERE `jobid`=:jobId AND `userid`=:userId');
      $stmt->execute(array(':userId' => $this->authToken->userId, ':jobId' => $jobId));

      return true;
    } catch (CannotDeleteMonitorJobException $ex) {
      throw $ex;
    } catch (Exception $ex) {
      return false;
    }
  }

  public function deleteAllJobs() {
    $nodes = (new NodeManager($this->authToken))->getUserJobNodes();
    $someFailed = false;

    foreach ($nodes as $node) {
      try {
        $client = $node->connect();

        $nodeJobs = $client->getJobsForUser($this->authToken->userId);
        foreach ($nodeJobs as $nodeJob) {
          $client->deleteJob(Job::createIdentifier($nodeJob->identifier->jobId, $this->authToken->userId));

          $stmt = Database::get()->prepare('DELETE FROM `job` WHERE `jobid`=:jobId AND `userid`=:userId');
          $stmt->execute(array(':userId' => $this->authToken->userId, ':jobId' => $nodeJob->identifier->jobId));
        }
      } catch (Exception $ex) {
        $someFailed = true;
      }
    }

    return !$someFailed;
  }
}
