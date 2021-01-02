<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class ConfirmAccount extends AbstractAPIMethod {
  static function name() {
    return 'ConfirmAccount';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, 2 * RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->token)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!UserManager::confirmAccount($request->token)) {
        throw new InternalErrorAPIException();
      }
    } catch (APIException $ex) {
      throw $ex;
    } catch (InvalidJWTTokenException $ex) {
      throw new ForbiddenAPIException();
    } catch (TokenExpiredException $ex) {
      throw new ForbiddenAPIException();
    } catch (Exception $ex) {
      throw new InternalErrorAPIException();
    }
    return (object)[];
  }
}
