<?php
require_once(__DIR__ . '/../config/limits.inc.php');
require_once(__DIR__ . '/RedisConnection.php');
require_once(__DIR__ . '/SessionToken.php');

class RateLimiter {
  public static function check($apiMethod, $request, $sessionToken) {
    global $methodRateLimitOverrides;

    $limits = $apiMethod->rateLimits($sessionToken);

    if ($sessionToken !== false) {
      $userId = $sessionToken->userId;
      if (isset($methodRateLimitOverrides[$userId])
          && isset($methodRateLimitOverrides[$userId][$apiMethod->name()])) {
        $limits = $methodRateLimitOverrides[$userId][$apiMethod->name()]();
      }
    }

    foreach ($limits as $limit) {
      $key = join(':', [
        $limit->rateLimitKey(),
        $apiMethod->rateLimitKey($request, $sessionToken)
      ]);

      if (!RateLimiter::checkWithKey($key, $limit->expire(), function ($value) use ($limit) {
        return $limit->check($value);
      })) {
        return false;
      }
    }

    return true;
  }

  public static function checkWithKey($key, $expire, $checkFunction) {
    $redis = RedisConnection::get();
    if ($redis === null) {
      return true;
    }

    $value = $redis->get($key);
    if ($value !== false && !$checkFunction($value)) {
      return false;
    }

    $res = $redis->multi()
      ->incr($key)
      ->expire($key, $expire)
      ->exec();

    if ($res === false) {
      // If the transaction fails, we cannot guarantee rate limiting constraints,
      // so we log this and allow the request to proceed to favor availability.
      error_log('Redis RateLimiter transaction failed for key: ' . $key);
      return true;
    }

    return true;
  }
}
