<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class CreateStatusPageDomain extends AbstractAPIMethod {
  static function name() {
    return 'CreateStatusPageDomain';
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
      && isset($request->domain)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->createStatusPageDomain($request->statusPageId, $request->domain)) {
        throw new InternalErrorAPIException();
      }
    } catch (StatusPageNotFoundException $ex) {
      throw new NotFoundAPIException();
    } catch (DomainAlreadyExistsException $ex) {
      throw new ConflictAPIException();
    }

    return true;
  }
}
