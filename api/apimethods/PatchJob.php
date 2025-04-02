<?php
require_once('config/denylists.inc.php');
require_once('lib/APIMethod.php');
require_once('resources/Job.php');

class PatchJob extends AbstractAPIMethod {
  static function name() {
    return 'PatchJob';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    global $jobUrlDenyList;

    if (isset($request->job->url)) {
      $lowerUrl = strtolower($request->job->url);
      foreach ($jobUrlDenyList as $deniedUrl) {
        if (strpos($lowerUrl, $deniedUrl) !== false) {
          return false;
        }
      }
    }

    return (
         isset($request->jobId)
      && is_numeric($request->jobId)
      && isset($request->job)
      && is_object($request->job)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $jobManager = new JobManager($sessionToken);

    $job = $jobManager->getJobDetails($request->jobId);
    if ($job === false) {
      throw new NotFoundAPIException();
    }

    $job->patchFromRequest($request);

    if (!$jobManager->updateJob($job)) {
      throw new InternalErrorAPIException();
    }

    return (object)[];
  }
}
