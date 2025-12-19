<?php
require_once('config/denylists.inc.php');
require_once('lib/APIMethod.php');
require_once('resources/Job.php');
require_once('lib/TurnstileVerifier.php');

class SubmitJobTestRun extends AbstractAPIMethod {
  static function name() {
    return 'SubmitJobTestRun';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
      //! @todo Also limit per job hostname
    ];
  }

  public function validateRequest($request) {
    global $config;
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
      && (isset($request->token) || $config['turnstileSecretKey'] === null)
    );
  }

  public function execute($request, $sessionToken, $language) {
    global $config;

    if ($config['turnstileSecretKey'] !== null && !TurnstileVerifier::verify($config['turnstileSecretKey'], $request->token)) {
      throw new ForbiddenAPIException();
    }

    $job = new Job;
    $job->updateFromRequest($request);

    $jobManager = new JobManager($sessionToken);

    $handle = null;
    try {
      $handle = $jobManager->submitJobTestRun($request->jobId, $job, $_SERVER['REMOTE_ADDR']);
    } catch (InvalidArgumentsException $ex) {
      throw new BadRequestAPIException();
    } catch (InternalErrorException $ex) {
      throw new InternalErrorAPIException();
    }

    return (object)[
      'handle' => $handle
    ];
  }
}
