<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class CloneJob extends AbstractAPIMethod {
  static function name() {
    return 'CloneJob';
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
         isset($request->jobId)
      && is_numeric($request->jobId)
      && isset($request->suffix)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $jobManager = new JobManager($sessionToken);

    $job = $jobManager->getJobDetails($request->jobId);
    if ($job === false) {
      throw new NotFoundAPIException();
    }

    $job->title .= ' (' . $request->suffix . ')';
    $job->enabled = false;

    $jobId = $jobManager->createJob($job);
    if (!$jobId) {
      throw new InternalErrorAPIException();
    }

    return (object)[
      'jobId' => $jobId
    ];
  }
}
