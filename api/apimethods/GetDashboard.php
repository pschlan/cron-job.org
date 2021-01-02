<?php
require_once('lib/APIMethod.php');
require_once('resources/History.php');
require_once('resources/Job.php');

class GetDashboard extends AbstractAPIMethod {
  static function name() {
    return 'GetDashboard';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    $events = (new HistoryManager($sessionToken))->getUserEvents();
    $events = array_map(function ($item) {
      $event = new stdClass;
      $event->type = get_class($item);
      $event->details = $item;
      return $event;
    }, $events);

    $jobs = (new JobManager($sessionToken))->getJobs();
    if (!$jobs) {
      throw new InternalErrorAPIException();
    }

    $result = (object)[
      'events'          => $events,
      'enabledJobs'     => count(array_filter($jobs->jobs, function($item) { return $item->enabled; })),
      'disabledJobs'    => count(array_filter($jobs->jobs, function($item) { return !$item->enabled; })),
      'successfulJobs'  => count(array_filter($jobs->jobs, function($item) { return $item->lastStatus == 1;})),
      'failedJobs'      => count(array_filter($jobs->jobs, function($item) { return $item->lastStatus > 1; })),
    ];

    return $result;
  }
}
