<?php
abstract class APIException extends Exception {
  abstract public function httpStatus();
}

class UnauthorizedAPIException extends APIException {
  public function httpStatus() {
    return '401 Unauthorized';
  }
}

class BadRequestAPIException extends APIException {
  public function httpStatus() {
    return '400 Bad Request';
  }
}

class NotFoundAPIException extends APIException {
  public function httpStatus() {
    return '404 Not Found';
  }
}

class ForbiddenAPIException extends APIException {
  public function httpStatus() {
    return '403 Forbidden';
  }
}

class ConflictAPIException extends APIException {
  public function httpStatus() {
    return '409 Conflict';
  }
}

class GoneAPIException extends APIException {
  public function httpStatus() {
    return '410 Gone';
  }
}

class QuotaExceededAPIException extends APIException {
  public function httpStatus() {
    return '429 Quota Limit Exceeded';
  }
}

class InternalErrorAPIException extends APIException {
  public function httpStatus() {
    return '500 Internal Server Error';
  }
}

class TooManyRequestsAPIException extends APIException {
  public function httpStatus() {
    return '429 Too Many Requests';
  }
}

class RateLimit {
  private $invocations = 0;
  private $seconds = 0;

  const SECOND = 1;
  const MINUTE = 60;
  const HOUR = 3600;
  const DAY = 86400;

  function __construct($invocations, $seconds) {
    $this->invocations = $invocations;
    $this->seconds = $seconds;
  }

  public function rateLimitKey() {
    return join(':', [
      'rateLimit',
      $this->invocations,
      $this->seconds,
      (int)floor(time() / $this->seconds)
    ]);
  }

  public function expire() {
    return $this->seconds + 1;
  }

  public function check($value) {
    return $value < $this->invocations;
  }
}

interface APIMethod {
  static function name();
  public function requiresAuthentication();
  public function validateRequest($request);
  public function execute($request, $sessionToken, $language);
  public function rateLimitKey($request, $sessionToken);
  public function rateLimits();
}

abstract class AbstractAPIMethod implements APIMethod {
  public function rateLimitKey($request, $sessionToken) {
    if ($this->requiresAuthentication()) {
      return implode(':', [ $this->name(), 'userId', $sessionToken->userId ]);
    } else {
      return implode(':', [ $this->name(), 'ipAddress', $_SERVER['REMOTE_ADDR'] ]);
    }
  }

  public function rateLimits() {
    return [];
  }
}
