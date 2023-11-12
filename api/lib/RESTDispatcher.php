<?php
require_once('config/config.inc.php');
require_once('config/limits.inc.php');
require_once('APIMethod.php');
require_once('RateLimiter.php');
require_once('SessionToken.php');
require_once('AbstractDispatcher.php');

class RESTDispatcher extends AbstractDispatcher {
  private $uriHandlers = array();

  public function registerDirectory($directory) {
    if (substr($directory, 0, -1) != '/') {
      $directory .= '/';
    }

    $d = dir($directory);
    while (($entry = $d->read()) !== false) {
      if (substr($entry, 0, 1) === '.' || substr($entry, -4) !== '.php') {
        continue;
      }

      $fileName = $directory . $entry;
      if (!is_file($fileName)) {
        continue;
      }

      $apiName = substr($entry, 0, -4);
      $this->handlers[$apiName] = function() use($apiName, $fileName) {
        require_once($fileName);
        return new $apiName;
      };
    }
  }

  public function registerURI($method, $pattern, $handler) {
    $this->uriHandlers[] = (object) [
      'method'  => $method,
      'pattern' => $pattern,
      'handler' => $handler
    ];
  }

  private function authenticate($apiKey, $ip, $method) {
    $stmt = Database::get()->prepare('SELECT `apikeyid` AS `apiKeyId`, `userid` AS `userId`, `enabled`, `limit_ips` AS `limitIPs` FROM `apikey` WHERE BINARY `apikey`=:apiKey');
    $stmt->execute([
      ':apiKey' => $apiKey
    ]);
    $row = $stmt->fetch(PDO::FETCH_OBJ);
    if (!$row) {
      throw new Exception('Invalid API key!');
    }

    if (!boolval($row->enabled)) {
      throw new Exception('API key disabled!');
    }

    if (trim($row->limitIPs) != '') {
      if (!in_array($ip, array_map('trim', explode(',', $row->limitIPs)))) {
        throw new ForbiddenAPIException();
      }
    }

    Database::get()->prepare('INSERT INTO `apilog`(`apikeyid`, `userid`, `ip`, `method`, `date`) '
        . 'VALUES(:apiKeyId, :userId, :ip, :method, :date)')
      ->execute([
        ':apiKeyId'   => intval($row->apiKeyId),
        ':userId'     => intval($row->userId),
        ':ip'         => $ip,
        ':method'     => $method,
        ':date'       => time()
      ]);

    return new SessionToken($row->userId);
  }

  private function checkApiKeyQuota($apiKey, $apiRequestsPerDay) {
    return RateLimiter::checkWithKey(
      implode(':', ['apiKey', $apiKey, (int)floor(time() / 86400)]),
      86400 + 1,
      function ($value) use ($apiRequestsPerDay) {
        return $value < $apiRequestsPerDay;
      }
    );
  }

  public function dispatch() {
    global $config, $apiRequetsPerDayOverride;

    try {
      header('Access-Control-Allow-Origin: *');
      header('Access-Control-Allow-Credentials: true');
      header('Cache-Control: no-cache');
      header('Pragma: no-cache');
      header('Expires: 0');

      if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('HTTP/1.1 204 No Content');
        header('Access-Control-Allow-Methods: GET, PUT, PATCH, DELETE');
        header('Access-Control-Allow-Headers: Content-Type,Authorization,Keep-Alive,User-Agent,If-Modified-Since,Cache-Control');
        return;
      }

      $uri = trim($_SERVER['PATH_INFO']);

      $handler = null;
      if (isset($_SERVER['CONTENT_TYPE']) && in_array($_SERVER['CONTENT_TYPE'], ['application/json', 'text/json'])) {
        $request = json_decode(file_get_contents('php://input'));
      } else {
        $request = new stdClass;
      }

      foreach ($this->uriHandlers as $uriHandler) {
        $matches = null;
        if (strcasecmp($_SERVER['REQUEST_METHOD'], $uriHandler->method) === 0 && preg_match('@^' . $uriHandler->pattern . '$@', $uri, $matches)) {
          if (!isset($this->handlers[$uriHandler->handler])) {
            throw new InternalErrorAPIException('URI handler not found: ' . $uri->handler);
          }
          $handler = ($this->handlers[$uriHandler->handler])();

          foreach ($matches as $key => $val) {
            if (!is_string($key)) {
              continue;
            }
            $request->$key = $val;
          }
        }
      }

      if ($handler === null) {
        throw new NotFoundAPIException();
      }

      if ($handler->requiresAuthentication()) {
        try {
          if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
            throw new Exception('No Authorization header found!');
          }
          if (substr(strtolower($_SERVER['HTTP_AUTHORIZATION']), 0, 7) !== 'bearer ') {
            throw new Exception('Unexpected Authorization method!');
          }
          $apiKey = trim(substr($_SERVER['HTTP_AUTHORIZATION'], 7));
          $sessionToken = $this->authenticate($apiKey, $_SERVER['REMOTE_ADDR'], $handler->name());
        } catch (ForbiddenAPIException $ex) {
          throw $ex;
        } catch (Exception $e) {
          throw new UnauthorizedAPIException();
        }
      }

      if (!RateLimiter::check($handler, $request, $sessionToken)) {
        throw new TooManyRequestsAPIException();
      }

      $apiRequestsPerDay = (new UserManager($sessionToken))->getGroup()->apiRequestsPerDay;
      if (isset($apiRequetsPerDayOverride[$sessionToken->userId])) {
        $apiRequestsPerDay = $apiRequetsPerDayOverride[$sessionToken->userId];
      }
      if (!$this->checkApiKeyQuota($apiKey, $apiRequestsPerDay)) {
        throw new TooManyRequestsAPIException();
      }

      if (!$handler->validateRequest($request)) {
        throw new BadRequestAPIException();
      }

      $result = $handler->execute($request, $sessionToken, $config['fallbackLanguage']);

      header('HTTP/1.1 200 OK');
      header('Content-Type: application/json');

      echo json_encode($result);

    } catch (APIException $e) {
      // TODO Remove
      error_log('API exception: ' . (string)$e);

      header('HTTP/1.1 ' . $e->httpStatus());

    } catch (Exception $e) {
      error_log('API exception: ' . (string)$e);

      header('HTTP/1.1 500 Internal Server Error');

    }
  }
}
