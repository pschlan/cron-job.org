<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class DeleteStatusPage extends AbstractAPIMethod {
  static function name() {
    return 'DeleteStatusPage';
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
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->deleteStatusPage($request->statusPageId)) {
        throw new InternalErrorAPIException();
      }
    } catch (StatusPageNotFoundException $ex) {
      throw new NotFoundAPIException();
    } catch (StatusPagePublishedException $ex) {
      throw new BadRequestAPIException();
    }

    return true;
  }
}
