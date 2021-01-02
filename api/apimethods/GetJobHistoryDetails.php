<?php
require_once('lib/APIMethod.php');
require_once('resources/History.php');

class GetJobHistoryDetails extends AbstractAPIMethod {
  static function name() {
    return 'GetJobHistoryDetails';
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
         isset($request->identifier)
      && count(explode('-', $request->identifier)) === 4
    );
  }

  public function execute($request, $sessionToken, $language) {
    [$jobId, $mday, $month, $jobLogId] = explode('-', $request->identifier);

    $historyDetails = (new HistoryManager($sessionToken))->getJobHistoryDetails(
      $jobId,
      $mday,
      $month,
      $jobLogId);
    if ($historyDetails === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'jobHistoryDetails' => $historyDetails
    ];
  }
}
