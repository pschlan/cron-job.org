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
      error_log('RateLimiter: Redis is not configured/connected, skipping rate limit check for key "' . $key . '"!');
      return true;
    }

    try {
      $value = $redis->get($key);
      if ($value !== false && !$checkFunction($value)) {
        return false;
      }

      $res = $redis->multi()
        ->incr($key)
        ->expire($key, $expire)
        ->exec();

      return true;
    } catch (RedisException $ex) {
      error_log('RateLimiter: Redis is unreachable, skipping rate limit check for key "' . $key . '": ' . (string)$ex);
      return true;
    }
  }

  public static function claimNotificationChannelEmailCreate($userId, $email) {
    global $config;

    $ttl = isset($config['notificationChannelEmailCooldownSeconds'])
      ? intval($config['notificationChannelEmailCooldownSeconds'])
      : 30;
    if ($ttl < 1) {
      $ttl = 30;
    }

    $hourlyLimit = isset($config['notificationChannelEmailCreatesPerHour'])
      ? intval($config['notificationChannelEmailCreatesPerHour'])
      : 5;
    if ($hourlyLimit < 1) {
      $hourlyLimit = 5;
    }

    $emailKey = 'notifyChannelEmail:' . hash('sha256', strtolower(trim($email)));
    if (!self::claimExclusive($emailKey, $ttl)) {
      return false;
    }

    $hourBucket = (int)floor(time() / 3600);
    $userKey = 'notifyChannelEmailUser:' . intval($userId) . ':' . $hourBucket;
    return self::checkWithKeyFailClosed($userKey, 3601, function ($value) use ($hourlyLimit) {
      return intval($value) < $hourlyLimit;
    });
  }

  private static function claimExclusive($key, $ttl) {
    $redis = RedisConnection::get();
    if ($redis === null) {
      error_log('RateLimiter: Redis is not configured/connected, fail-closed for key "' . $key . '"');
      return false;
    }

    try {
      return $redis->set($key, '1', ['nx', 'ex' => (int)$ttl]) === true;
    } catch (RedisException $ex) {
      error_log('RateLimiter: Redis is unreachable, fail-closed for key "' . $key . '": ' . (string)$ex);
      return false;
    }
  }

  private static function checkWithKeyFailClosed($key, $expire, $checkFunction) {
    $redis = RedisConnection::get();
    if ($redis === null) {
      error_log('RateLimiter: Redis is not configured/connected, fail-closed for key "' . $key . '"');
      return false;
    }

    try {
      $value = $redis->get($key);
      if ($value !== false && !$checkFunction($value)) {
        return false;
      }

      $redis->multi()
        ->incr($key)
        ->expire($key, $expire)
        ->exec();

      return true;
    } catch (RedisException $ex) {
      error_log('RateLimiter: Redis is unreachable, fail-closed for key "' . $key . '": ' . (string)$ex);
      return false;
    }
  }
}
