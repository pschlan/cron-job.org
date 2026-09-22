<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

require_once('lib/PaddleAPI.php');

class GetSubscriptionLink extends AbstractAPIMethod {
  static function name() {
    return 'GetSubscriptionLink';
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
    return isset($request->type)
      && in_array($request->type, ['manage', 'cancel']);
  }

  public function execute($request, $sessionToken, $language) {
    global $paddleConfig;

    if (!isset($paddleConfig)
        || empty($paddleConfig['apiEndpoint'])
        || empty($paddleConfig['apiKey'])
        || empty($paddleConfig['portalApiKey'])) {
      throw new InternalErrorAPIException();
    }

    $userManager = new UserManager($sessionToken);

    $url = null;
    if ($request->type === 'manage') {
      $customerId = $userManager->getPaddleCustomerId();
      if (!$customerId) {
        throw new BadRequestAPIException();
      }

      $portalSession = PaddleAPI::createPortalSession($customerId);
      if (!$portalSession) {
        throw new InternalErrorAPIException();
      }

      $url = $portalSession->data->urls->general->overview;

    } else if ($request->type === 'cancel') {
      $subscription = $userManager->getSubscription();
      if (!$subscription || $subscription->type !== 'paddle') {
        throw new BadRequestAPIException();
      }

      $paddleSubscription = PaddleAPI::getSubscription($subscription->getSubscriptionId());
      if (!$paddleSubscription) {
        throw new InternalErrorAPIException();
      }

      $url = $paddleSubscription->data->management_urls->cancel;
    }

    return (object)[
      'url' => $url
    ];
  }
}
