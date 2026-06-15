<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class CreateStatusPageIncident extends AbstractAPIMethod {
  static function name() {
    return 'CreateStatusPageIncident';
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
         isset($request->statusPageId)
      && is_numeric($request->statusPageId)
      && isset($request->title)
      && isset($request->description)
      && isset($request->startDate)
      && is_numeric($request->startDate)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      $status = isset($request->status) ? boolval($request->status) : true;
      return $statusPageManager->createStatusPageIncident(
        $request->statusPageId,
        $request->title,
        $request->description,
        $request->startDate,
        $status
      );
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    } catch (StatusPageNotFoundException $ex) {
      throw new NotFoundAPIException();
    }
  }
}
