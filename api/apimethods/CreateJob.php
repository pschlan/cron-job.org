<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class CreateJob extends AbstractAPIMethod {
  static function name() {
    return 'CreateJob';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, RateLimit::SECOND),
      new RateLimit(5, RateLimit::MINUTE)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->job)
      && is_object($request->job)
      && isset($request->job->url)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $job = new Job;
    $job->updateFromRequest($request);

    $jobId = (new JobManager($sessionToken))
      ->createJob($job);
    
    if ($jobId === false) {
      throw new InternalErrorAPIException();
    }

    return (object)[
      'jobId' => $jobId
    ];
  }
}
