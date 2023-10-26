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

      if ($event->type === 'HistoryItem') {
        $event->details->jobFolderId = isset($jobIdToFolderId[$item->jobId])
          ? $jobIdToFolderId[$item->jobId]
          : 0;
      }

      return $event;
    }, $events);

    $userProfile = (new UserManager($sessionToken))->getProfile();

    $result = (object)[
      'events'              => $events,
      'enabledJobs'         => count(array_filter($jobs->jobs, function($item) { return $item->enabled; })),
      'disabledJobs'        => count(array_filter($jobs->jobs, function($item) { return !$item->enabled; })),
      'successfulJobs'      => count(array_filter($jobs->jobs, function($item) { return $item->lastStatus == 1;})),
      'failedJobs'          => count(array_filter($jobs->jobs, function($item) { return $item->lastStatus > 1; })),
      'newsletterSubscribe' => $userProfile->newsletterSubscribe,
      'notificationsAutoDisabled' => $userProfile->notificationsAutoDisabled
    ];

    return $result;
  }
}
