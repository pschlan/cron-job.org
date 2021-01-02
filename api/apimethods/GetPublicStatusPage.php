<?php
require_once('lib/APIMethod.php');
require_once('resources/PublicStatusPage.php');

class GetPublicStatusPage extends AbstractAPIMethod {
  static function name() {
    return 'GetPublicStatusPage';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->domain)
      && strlen($request->domain) >= 3
    );
  }

  public function execute($request, $sessionToken, $language) {
    ob_start('ob_gzhandler');

    $statusPage = (new PublicStatusPageManager())->getStatusPage($request->domain);
    if ($statusPage === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'statusPage' => $statusPage
    ];
  }
}
