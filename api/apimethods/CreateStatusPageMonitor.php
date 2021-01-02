<?php
require_once('lib/APIMethod.php');
require_once('resources/StatusPage.php');

class CreateStatusPageMonitor extends AbstractAPIMethod {
  static function name() {
    return 'CreateStatusPageMonitor';
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
      && isset($request->jobId)
      && is_numeric($request->statusPageId)
      && is_numeric($request->jobId)
      && isset($request->title)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $statusPageManager = new StatusPageManager($sessionToken);

    try {
      if (!$statusPageManager->createStatusPageMonitor($request->statusPageId, $request->jobId, $request->title)) {
        throw new InternalErrorAPIException();
      }
    } catch (InternalJobUpdateFailed $ex) {
      throw new InternalErrorAPIException();
    } catch (StatusPageJobNotFoundException | StatusPageNotFoundException $ex) {
      throw new NotFoundAPIException();
    } catch (QuotaExceededException $ex) {
      throw new QuotaExceededAPIException();
    }

    return true;
  }
}
