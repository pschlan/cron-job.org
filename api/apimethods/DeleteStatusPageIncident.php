<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class DeleteStatusPageIncident extends AbstractAPIMethod {
  static function name() {
    return 'DeleteStatusPageIncident';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    global $config;
    if ($config['statusPageDomain'] === null) {
      return false;
    }
    return (
         isset($request->incidentId)
      && is_numeric($request->incidentId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->deleteStatusPageIncident($request->incidentId)) {
        throw new InternalErrorAPIException();
      }
    } catch (StatusPageIncidentNotFoundException $ex) {
      throw new NotFoundAPIException();
    }

    return true;
  }
}
