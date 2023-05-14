<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class ExecuteJobMassAction extends AbstractAPIMethod {
  static function name() {
    return 'ExecuteJobMassAction';
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
    return (
         isset($request->jobIds)
      && is_array($request->jobIds)
      && isset($request->action)
      && in_array($request->action, ['enable', 'disable', 'delete', 'move'])
      && ($request->action !== 'move' || isset($request->folderId))
    );
  }

  public function execute($request, $sessionToken, $language) {
    if (!(new JobManager($sessionToken))->executeMassAction($request->jobIds, $request->action, $request)) {
      throw new InternalErrorAPIException();
    }
    return true;
  }
}
