<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class CreateStatusPage extends AbstractAPIMethod {
  static function name() {
    return 'CreateStatusPage';
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
         isset($request->title)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      $statusPageId = (new StatusPageManager($sessionToken))
        ->createStatusPage($request->title);

      if ($statusPageId === false) {
        throw new InternalErrorAPIException();
      }

      return (object)[
        'statusPageId' => $statusPageId
      ];
    } catch (QuotaExceededException $ex) {
      throw new QuotaExceededAPIException();
    }
  }
}
