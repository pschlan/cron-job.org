<?php
require_once('lib/APIMethod.php');
require_once('resources/PublicStatusPage.php');

class MayRequestStatusPageCertificate extends AbstractAPIMethod {
  static function name() {
    return 'MayRequestStatusPageCertificate';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [];
  }

  public function validateRequest($request) {
    return (
         isset($request->domain)
      && strlen($request->domain) >= 3
    );
  }

  public function execute($request, $sessionToken, $language) {
    $result = (new PublicStatusPageManager())->mayRequestCertificate($request->domain);
    if ($result === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'result' => true
    ];
  }
}
