<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class GetJobs extends AbstractAPIMethod {
  static function name() {
    return 'GetJobs';
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
    return (new JobManager($sessionToken))->getJobs();
  }
}
