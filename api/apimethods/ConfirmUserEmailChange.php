<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class ConfirmUserEmailChange extends AbstractAPIMethod {
  static function name() {
    return 'ConfirmUserEmailChange';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->token)
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!UserManager::confirmEmailChange($request->token)) {
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
