<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class DeleteStatusPageMonitor extends AbstractAPIMethod {
  static function name() {
    return 'DeleteStatusPageMonitor';
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
         isset($request->monitorId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->deleteStatusPageMonitor($request->monitorId)) {
        throw new InternalErrorAPIException();
      }
    } catch (InternalJobUpdateFailed $ex) {
      throw new InternalErrorAPIException();
    } catch (StatusPageMonitorNotFoundException $ex) {
      throw new NotFoundAPIException();
    }

    return true;
  }
}
