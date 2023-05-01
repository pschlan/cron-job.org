<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

class DeleteAccount extends AbstractAPIMethod {
  static function name() {
    return 'DeleteAccount';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->emailAddress)
      && isset($request->really)
      && $request->really === 'reallyDeleteAccount'
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      if (!(new UserManager($sessionToken))->deleteAccount($request->emailAddress)) {
        throw new InternalErrorAPIException();
      }
    } catch (InvalidEmailAddressException $ex) {
      throw new ForbiddenAPIException();
    } catch (ActiveSubscriptionException $ex) {
      throw new ForbiddenAPIException();
    } catch (FailedToDeleteAccountException $ex) {
      throw new InternalErrorAPIException();
    }

    return (object)[];
  }
}
