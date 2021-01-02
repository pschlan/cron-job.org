<?php
require_once('lib/APIMethod.php');
require_once('resources/History.php');

class GetJobHistory extends AbstractAPIMethod {
  static function name() {
    return 'GetJobHistory';
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
    $history = (new HistoryManager($sessionToken))->getJobHistory($request->jobId);
    if ($history === false) {
      throw new NotFoundAPIException();
    }
    return $history;
  }
}
