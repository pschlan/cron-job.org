<?php
require_once('lib/APIMethod.php');
require_once('resources/Job.php');
require_once('lib/RecaptchaVerifier.php');

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
    return (
         isset($request->jobId)
      && is_numeric($request->jobId)
      && isset($request->job)
      && is_object($request->job)
      && (isset($request->token) || $config['recaptchaSecretKey'] === null)
    );
  }

  public function execute($request, $sessionToken, $language) {
    global $config;

    if ($config['recaptchaSecretKey'] !== null && !RecaptchaVerifier::verify($config['recaptchaSecretKey'], $request->token)) {
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
