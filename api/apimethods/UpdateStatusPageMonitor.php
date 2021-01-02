<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class UpdateStatusPageMonitor extends AbstractAPIMethod {
  static function name() {
    return 'UpdateStatusPageMonitor';
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
         isset($request->monitorId)
      && isset($request->monitor)
      && is_object($request->monitor)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->updateStatusPageMonitor($request->monitorId, $request->monitor)) {
        throw new InternalErrorAPIException();
      }
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    } catch (StatusPageMonitorNotFoundException $ex) {
      throw new NotFoundAPIException();
    }

    return true;
  }
}
