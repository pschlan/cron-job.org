<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class DeleteJob extends AbstractAPIMethod {
  static function name() {
    return 'DeleteJob';
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
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!(new JobManager($sessionToken))->deleteJob($request->jobId)) {
        throw new NotFoundAPIException();
      }
    } catch (CannotDeleteMonitorJobException $ex) {
      throw new BadRequestAPIException();
    }

    return (object)[];
  }
}
