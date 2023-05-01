<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

require_once('lib/3rdparty/stripe-php/init.php');

class CreateBillingPortalSession extends AbstractAPIMethod {
  static function name() {
    return 'CreateBillingPortalSession';
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
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    global $stripeConfig, $config;

    $userManager = new UserManager($sessionToken);
    $stripeCustomerId = $userManager->getStripeCustomerId();
    if (!$stripeCustomerId) {
      throw new BadRequestAPIException();
    }

    Stripe\Stripe::setApiKey($stripeConfig['apiKey']);

    $portalSession = \Stripe\BillingPortal\Session::create([
      'customer' => $stripeCustomerId,
      'return_url' => $config['frontendURL'] . 'settings'
    ]);

    return (object)[
      'url' => $portalSession->url
    ];
  }
}
