<?php
require_once('RedisConnection.php');
require_once('SessionToken.php');

class RateLimiter {
  public static function check($apiMethod, $request, $sessionToken) {
    $redis = RedisConnection::get();
    if ($redis === null) {
      return true;
    }

    foreach ($apiMethod->rateLimits() as $limit) {
      $key = join(':', [
        $limit->rateLimitKey(),
        $apiMethod->rateLimitKey($request, $sessionToken)
      ]);

      $value = $redis->get($key);
      if ($value !== false && !$limit->check($value)) {
        return false;
      }

      $res = $redis->multi()
        ->incr($key)
        ->expire($key, $limit->expire())
        ->exec();
    }

    return true;
  }
}
