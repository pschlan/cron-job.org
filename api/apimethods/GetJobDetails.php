<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class GetJobDetails extends AbstractAPIMethod {
  static function name() {
    return 'GetJobDetails';
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
    return (
         isset($request->jobId)
      && is_numeric($request->jobId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $jobDetails = (new JobManager($sessionToken))->getJobDetails($request->jobId);
    if ($jobDetails === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'jobDetails' => $jobDetails
    ];
  }
}
