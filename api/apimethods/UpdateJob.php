<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class UpdateJob extends AbstractAPIMethod {
  static function name() {
    return 'UpdateJob';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->jobId)
      && is_numeric($request->jobId)
      && isset($request->job)
      && is_object($request->job)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $jobManager = new JobManager($sessionToken);

    $job = $jobManager->getJobDetails($request->jobId);
    if ($job === false) {
      throw new NotFoundAPIException();
    }

    $job->updateFromRequest($request);

    if (!$jobManager->updateJob($job)) {
      throw new InternalErrorAPIException();
    }

    return (object)[];
  }
}
