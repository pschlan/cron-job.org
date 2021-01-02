<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class UpdateStatusPage extends AbstractAPIMethod {
  static function name() {
    return 'UpdateStatusPage';
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
      && isset($request->statusPage)
      && is_object($request->statusPage)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->updateStatusPage($request->statusPageId, $request->statusPage)) {
        throw new InternalErrorAPIException();
      }
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    } catch (StatusPageNotFoundException $ex) {
      throw new NotFoundAPIException();
    }

    return true;
  }
}
