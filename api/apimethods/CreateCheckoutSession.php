<?php
require_once('lib/APIMethod.php');
require_once('resources/User.php');

require_once('lib/3rdparty/stripe-php/init.php');

class CreateCheckoutSession extends AbstractAPIMethod {
  static function name() {
    return 'CreateCheckoutSession';
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
    global $stripeConfig;

    return (
         isset($request->product)
      && isset($stripeConfig['products'][$request->product])
    );
  }

  public function execute($request, $sessionToken, $language) {
    global $stripeConfig, $config;

    $userManager = new UserManager($sessionToken);
    $profile = $userManager->getProfile();
    $stripeCustomerId = $userManager->getStripeCustomerId();

    Stripe\Stripe::setApiKey($stripeConfig['apiKey']);

    $args = [
      'subscription_data' => [
        'metadata' => [
          'cjoUserId' => $sessionToken->userId
        ]
      ],

      'customer' => $stripeCustomerId ? $stripeCustomerId : null,
      'customer_email' => $stripeCustomerId ? null : $profile->email,

      'line_items' => [[
        'price' => $stripeConfig['products'][$request->product]['priceId'],
        'quantity' => 1,
      ]],

      'payment_method_types' => [
        'card'
      ],

      'mode' => 'subscription',
      'success_url' => $config['frontendURL'] . 'settings?checkoutSuccess=true',
      'cancel_url' => $config['frontendURL'] . 'settings',

      'automatic_tax' => [
        'enabled' => true
      ],
      'tax_id_collection' => [
        'enabled' => true
      ]
    ];

    if ($stripeCustomerId) {
      $args['customer_update'] = [
        'name' => 'auto'
      ];
    }

    $checkoutSession = \Stripe\Checkout\Session::create($args);

    return (object)[
      'url' => $checkoutSession->url
    ];
  }
}
