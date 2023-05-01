<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class DeleteJobTestRun extends AbstractAPIMethod {
  static function name() {
    return 'DeleteJobTestRun';
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
         isset($request->handle)
      && is_string($request->handle)
    );
  }

  public function execute($request, $sessionToken, $language) {
    global $config;

    $jobManager = new JobManager($sessionToken);

    $status = null;
    try {
      $status = $jobManager->deleteJobTestRun($request->handle);
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    } catch (InternalErrorException $ex) {
      throw new InternalErrorAPIException();
    }

    return (object)[];
  }
}
