<?php
require_once('lib/APIMethod.php');
require_once('resources/History.php');
require_once('resources/Job.php');
require_once('resources/User.php');

class GetDashboard extends AbstractAPIMethod {
  static function name() {
    return 'GetDashboard';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  private static function trimJob($job) {
    return (object)[
      'jobId'         => $job->jobId,
      'folderId'      => $job->folderId,
      'title'         => $job->title,
      'url'           => $job->url,
      'lastStatus'    => $job->lastStatus,
      'lastDuration'  => $job->lastDuration,
      'nextExecution' => $job->nextExecution,
      'sslCertExpiry' => isset($job->sslCertExpiry) ? $job->sslCertExpiry : null
    ];
  }

  public function execute($request, $sessionToken, $language) {
    $jobs = (new JobManager($sessionToken))->getJobs();
    if (!$jobs) {
      throw new InternalErrorAPIException();
    }

    $jobIdToFolderId = [];
    foreach ($jobs->jobs as $job) {
      $jobIdToFolderId[$job->jobId] = $job->folderId;
    }

    $events = (new HistoryManager($sessionToken))->getUserEvents();
    $events = array_map(function ($item) use ($jobIdToFolderId) {
      $event = new stdClass;
      $event->type = get_class($item);
      $event->details = $item;

      if ($event->type === 'HistoryItem' || $event->type === 'NotificationItem') {
        $event->details->jobFolderId = isset($jobIdToFolderId[$item->jobId])
          ? $jobIdToFolderId[$item->jobId]
          : 0;
      }

      return $event;
    }, $events);

    $userProfile = (new UserManager($sessionToken))->getProfile();

    $upcomingJobs = array_filter($jobs->jobs, function($item) {
      return $item->enabled && isset($item->nextExecution) && $item->nextExecution !== null;
    });
    usort($upcomingJobs, function($a, $b) {
      return $a->nextExecution <=> $b->nextExecution;
    });
    $upcomingJobs = array_map([self::class, 'trimJob'], array_slice($upcomingJobs, 0, 5));

    $certExpiryThreshold = time() + 14 * 86400;
    $expiringCerts = array_filter($jobs->jobs, function($item) use ($certExpiryThreshold) {
      return isset($item->sslCertExpiry) && $item->sslCertExpiry > 0 && $item->sslCertExpiry <= $certExpiryThreshold;
    });
    usort($expiringCerts, function($a, $b) {
      return $a->sslCertExpiry <=> $b->sslCertExpiry;
    });
    $expiringCerts = array_map([self::class, 'trimJob'], $expiringCerts);

    $failedJobList = array_filter($jobs->jobs, function($item) {
      return $item->lastStatus > 1;
    });
    usort($failedJobList, function($a, $b) {
      return [$b->lastStatus, $a->title] <=> [$a->lastStatus, $b->title];
    });
    $failedJobList = array_map([self::class, 'trimJob'], $failedJobList);

    $result = (object)[
      'events'              => $events,
      'enabledJobs'         => count(array_filter($jobs->jobs, function($item) { return $item->enabled; })),
      'disabledJobs'        => count(array_filter($jobs->jobs, function($item) { return !$item->enabled; })),
      'successfulJobs'      => count(array_filter($jobs->jobs, function($item) { return $item->lastStatus == 1;})),
      'failedJobs'          => count(array_filter($jobs->jobs, function($item) { return $item->lastStatus > 1; })),
      'upcomingJobs'        => $upcomingJobs,
      'expiringCerts'       => $expiringCerts,
      'failedJobList'       => $failedJobList,
      'newsletterSubscribe' => $userProfile->newsletterSubscribe,
      'notificationsAutoDisabled' => $userProfile->notificationsAutoDisabled
    ];

    return $result;
  }
}
