<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class UpdateStatusPageIncident extends AbstractAPIMethod {
  static function name() {
    return 'UpdateStatusPageIncident';
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
      && isset($request->incident)
      && is_object($request->incident)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->updateStatusPageIncident($request->incidentId, $request->incident)) {
        throw new InternalErrorAPIException();
      }
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    } catch (StatusPageIncidentNotFoundException $ex) {
      throw new NotFoundAPIException();
    }

    return true;
  }
}
