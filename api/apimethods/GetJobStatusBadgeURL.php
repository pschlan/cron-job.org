<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class GetJobStatusBadgeURL extends AbstractAPIMethod {
  static function name() {
    return 'GetJobStatusBadgeURL';
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
    return (
         isset($request->jobId)
      && is_numeric($request->jobId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $options = 0;

    if (isset($request->withTitle) && $request->withTitle) {
        $options |= JobStatusBadgeOptions::WITH_TITLE;
    }

    if (isset($request->withLatency) && $request->withLatency) {
        $options |= JobStatusBadgeOptions::WITH_LATENCY;
    }

    if (isset($request->withLastExecutionDate) && $request->withLastExecutionDate) {
        $options |= JobStatusBadgeOptions::WITH_LAST_EXECUTION_DATE;
    }

    $url = (new JobManager($sessionToken))->getPublicJobStatusBadgeURL($request->jobId, $options);
    if ($url === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'url' => $url
    ];
  }
}
