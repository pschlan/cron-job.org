<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class GetStatusPage extends AbstractAPIMethod {
  static function name() {
    return 'GetStatusPage';
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
         isset($request->statusPageId)
      && is_numeric($request->statusPageId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPage = (new StatusPageManager($sessionToken))->getStatusPage($request->statusPageId);
    if ($statusPage === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'statusPage' => $statusPage
    ];
  }
}
