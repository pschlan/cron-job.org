<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class UpdateStatusPageMonitorsOrder extends AbstractAPIMethod {
  static function name() {
    return 'UpdateStatusPageMonitorsOrder';
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
         isset($request->statusPageId)
      && isset($request->order)
      && is_array($request->order)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->updateStatusPageMonitorsOrder($request->statusPageId, $request->order)) {
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
