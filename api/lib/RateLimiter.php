<?php
require_once('config/limits.inc.php');
require_once('RedisConnection.php');
require_once('SessionToken.php');

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

    return true;
  }
}
