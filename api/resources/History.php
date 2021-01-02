<?php
require_once('lib/Database.php');
require_once('lib/ChronosClient.php');
require_once('lib/ExecutionPredictor.php');
require_once('Node.php');

class HistoryItem {
  public $jobLogId;
  public $jobId;
  public $identifier;
  public $date;
  public $datePlanned;
  public $jitter;
  public $url;
  public $duration;
  public $status;
  public $statusText;
  public $httpStatus;
  public $headers;
  public $body;
  public $stats;

  public static function fromThriftJobLogEntry($log) {
    $result = new HistoryItem;

    $result->jobLogId       = $log->jobLogId;
    $result->jobId          = $log->jobIdentifier->jobId;
    $result->identifier     = implode('-', [$log->jobIdentifier->jobId, $log->mday, $log->month, $log->jobLogId]);
    $result->date           = $log->date;
    $result->datePlanned    = $log->datePlanned;
    $result->jitter         = $log->jitter;
    $result->url            = $log->url;
    $result->duration       = $log->duration;
    $result->status         = $log->status;
    $result->statusText     = $log->statusText;
    $result->httpStatus     = $log->httpStatus;
    $result->headers        = isset($log->headers) ? $log->headers  : false;
    $result->body           = isset($log->body)    ? $log->body     : false;
    $result->stats          = isset($log->stats)   ? $log->stats    : null;

    return $result;
  }
}

class NotificationItem {
  public $notificationId;
  public $jobId;
  public $jobLogId;
  public $date;
  public $type;
  public $dateStarted;
  public $datePlanned;
  public $url;
  public $executionStatus;
  public $executionStatusText;
  public $httpStatus;

  public static function fromThriftNotificationEntry($notification) {
    $result = new NotificationItem;

    $result->notificationId       = $notification->notificationId;
    $result->jobId                = $notification->jobIdentifier->jobId;
    $result->jobLogId             = $notification->jobLogId;
    $result->date                 = $notification->date;
    $result->type                 = $notification->type;
    $result->dateStarted          = $notification->dateStarted;
    $result->datePlanned          = $notification->datePlanned;
    $result->url                  = $notification->url;
    $result->executionStatus      = $notification->executionStatus;
    $result->executionStatusText  = $notification->executionStatusText;
    $result->httpStatus           = $notification->httpStatus;

    return $result;
  }
}

class HistoryManager {
  private $authToken;

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  private function createJobIdentifier($jobId) {
    $identifier = new \chronos\JobIdentifier;
    $identifier->jobId = $jobId;
    $identifier->userId = $this->authToken->userId;
    return $identifier;
  }

  public function getJobHistory($jobId, $maxEntries = 25, $maxPredictions = 3) {
    $node = (new NodeManager($this->authToken))->getJobNode($jobId);
    if (!$node) {
      return false;
    }

    $history = [];
    $predictions = [];
    try {
      $client = $node->connect();

      $history = $this->getNodeJobHistory($client, $jobId, $maxEntries);
      if ($history === false) {
        throw new Exception('Failed to retrieve node job history!');
      }

      $jobDetails = $client->getJobDetails($this->createJobIdentifier($jobId));
      if ($jobDetails->metaData->enabled) {
        $predictor = new ExecutionPredictor(
          $jobDetails->schedule->timezone,
          array_keys($jobDetails->schedule->months),
          array_keys($jobDetails->schedule->mdays),
          array_keys($jobDetails->schedule->wdays),
          array_keys($jobDetails->schedule->hours),
          array_keys($jobDetails->schedule->minutes)
        );
        $predictions = $predictor->predictNextExecutions(time(), $maxPredictions);
      }
    } catch (Exception $ex) {
      return false;
    }

    return (object)[
      'history' => $history,
      'predictions' => $predictions
    ];
  }

  public function getUserHistory($maxEntries = 25) {
    $nodes = (new NodeManager($this->authToken))->getUserJobNodes();
    $someFailed = false;
    $result = [];

    foreach ($nodes as $node) {
      try {
        $client = $node->connect();

        $nodeLog = $this->getNodeJobHistory($client, 0, $maxEntries);
			  $result = array_merge($result, $nodeLog);
      } catch (Exception $ex) {
        $someFailed = true;
      }
    }

    $keys = array_keys($result);
    array_multisort(
      array_column($result, 'jobLogId'), SORT_DESC, SORT_NUMERIC,
      $result, $keys
    );

    return (object) [
      'history' => $result,
      'someFailed' => $someFailed
    ];
  }

  public function getUserEvents($maxEntries = 25) {
    $nodes = (new NodeManager($this->authToken))->getUserJobNodes();
    $someFailed = false;
    $events = [];

    foreach ($nodes as $node) {
      try {
        $client = $node->connect();

        $nodeLog = $this->getNodeJobHistory($client, 0, $maxEntries);
        if ($nodeLog !== false) {
          $events = array_merge($events, $nodeLog);
        } else {
          $someFailed = true;
        }

        $nodeNotifications = $this->getNodeNotifications($client, $maxEntries);
        if ($nodeNotifications !== false) {
          $events = array_merge($events, $nodeNotifications);
        } else {
          $someFailed = true;
        }
      } catch (Exception $ex) {
        $someFailed = true;
      }
    }

    usort($events, function ($a, $b) {
      return $b->date - $a->date;
    });

    $events = array_slice($events, 0, $maxEntries);
    return $events;
  }

  private function getNodeNotifications($client, $maxEntries) {
    try {
      $notifications = $client->getNotifications($this->authToken->userId, $maxEntries);
      
      $result = [];
      foreach ($notifications as $notification) {
        $result[] = NotificationItem::fromThriftNotificationEntry($notification);
      }

      return $result;
    } catch (Exception $ex) {
      return false;
    }
  }

  private function getNodeJobHistory($client, $jobId, $maxEntries) {
    $history = [];
    try {
      $logs = $client->getJobLog($this->createJobIdentifier($jobId), $maxEntries);
      foreach ($logs as $log) {
        $history[] = HistoryItem::fromThriftJobLogEntry($log);
      }
    } catch (Exception $ex) {
      return false;
    }
    return $history;
  }

  public function getJobHistoryDetails($jobId, $mday, $month, $jobLogId) {
    $node = (new NodeManager($this->authToken))->getJobNode($jobId);
    if (!$node) {
      return false;
    }

    try {
      $client = $node->connect();

      $details = $client->getJobLogDetails($this->authToken->userId, $mday, $month, $jobLogId);
      return HistoryItem::fromThriftJobLogEntry($details);
    } catch (Exception $ex) {
      return false;
    }
  }
}
