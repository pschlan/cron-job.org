<?php
require_once('./config/config.inc.php');

require_once('./lib/Database.php');
require_once('./lib/Language.php');
require_once('./lib/Mail.php');

require_once('./resources/User.php');

require_once('lib/3rdparty/stripe-php/init.php');

Language::initialize();
Database::initialize(
  $config['db']['host'],
  $config['db']['user'],
  $config['db']['password'],
  $config['db']['database']
);

Stripe\Stripe::setApiKey($stripeConfig['apiKey']);

$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'];

$event = null;
try {
  $event = \Stripe\Webhook::constructEvent(
      $payload, $sig_header, $stripeConfig['endpointSecret']
  );
} catch(\UnexpectedValueException $e) {
  // Invalid payload
  echo 'Webhook error while parsing basic request.';
  http_response_code(400);
  exit();
} catch(\Stripe\Exception\SignatureVerificationException $e) {
  // Invalid signature
  echo 'Invalid signature.';
  http_response_code(400);
  exit();
}

class SubscriptionManager {
  public const STATUS_INACTIVE = 0;
  public const STATUS_PENDING = 1;
  public const STATUS_ACTIVE = 2;
  public const STATUS_EXPIRING = 3;
  public const STATUS_CANCELLED = 4;

  private $userId;

  public function __construct($userId) {
    $this->userId = $userId;
  }

  public function updateStripeCustomerMapping($customerId) {
    Database::get()->prepare('REPLACE INTO `user_stripe_mapping`(`userid`, `stripe_customer_id`) VALUES(:userId, :stripeCustomerId)')
      ->execute([
        'userId'            => $this->userId,
        'stripeCustomerId'  => $customerId
      ]);
  }

  public static function deleteStripeCustomer($customerId) {
    $stmt = Database::get()->prepare('SELECT `userid` AS `userId` FROM `user_stripe_mapping` WHERE `stripe_customer_id`=:stripeCustomerId');
    $stmt->execute([
      'stripeCustomerId'  => $customerId
    ]);

    if ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
      Database::get()->prepare('DELETE FROM `user_subscription` WHERE `userid`=:userId')
        ->execute([
          'userId'            => $row->userId
        ]);

      Database::get()->prepare('DELETE FROM `user_stripe_mapping` WHERE `stripe_customer_id`=:stripeCustomerId AND `userid`=:userId')
        ->execute([
          'stripeCustomerId'  => $customerId,
          'userId'            => $row->userId
        ]);
    }
  }

  private function getSubscriptionStatus() {
    $result = self::STATUS_INACTIVE;

    $stmt = Database::get()->prepare('SELECT `status` FROM `user_subscription` WHERE `userid`=:userId');
    $stmt->execute([
      'userId' => $this->userId
    ]);
    if ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
      $result = intval($row->status);
    }

    return $result;
  }

  public function activateSubscription($productId, $subscriptionId, $currentPeriodStart, $currentPeriodEnd, $cancelAt) {
    global $stripeConfig;

    if (!isset($stripeConfig['products'][$productId])) {
      throw new InvalidArgumentException('Unknown product id!');
    }

    $oldStatus = $this->getSubscriptionStatus();

    $userGroupId = $stripeConfig['products'][$productId]['userGroupId'];
    Database::get()
      ->prepare('UPDATE `user` SET `usergroupid`=:userGroupId WHERE `userid`=:userId')
      ->execute([
        ':userGroupId'          => $userGroupId,
        ':userId'               => $this->userId
      ]);

    $newStatus = $cancelAt ? self::STATUS_EXPIRING : self::STATUS_ACTIVE;
    Database::get()
      ->prepare('REPLACE INTO `user_subscription`(`userid`, `product_id`, `subscription_id`, `current_period_start`, `current_period_end`, `cancel_at`, `status`) '
        . 'VALUES(:userId, :productId, :subscriptionId, :currentPeriodStart, :currentPeriodEnd,  :cancelAt, :status)')
      ->execute([
        ':userId'               => $this->userId,
        ':productId'            => $productId,
        ':subscriptionId'       => $subscriptionId,
        ':currentPeriodStart'   => $currentPeriodStart,
        ':currentPeriodEnd'     => $currentPeriodEnd,
        ':cancelAt'             => $cancelAt === null ? 0 : $cancelAt,
        ':status'               => $newStatus
      ]);

    if ($newStatus === self::STATUS_ACTIVE && $newStatus !== $oldStatus) {
      $this->sendNotificationEmail('subscriptionActivatedEmail', []);
    } else if ($newStatus === self::STATUS_EXPIRING && $newStatus !== $oldStatus) {
      $this->sendNotificationEmail('subscriptionExpiringEmail', [], [
        'cancelAt'              => ['dateFormat', $cancelAt]
      ]);
    }
  }

  private function sendNotificationEmail($mailName, $args = [], $dateArgs = []) {
    global $config;

    $stmt = Database::get()->prepare('SELECT `lastlogin_lang` AS `language`, `email` FROM `user` WHERE `userid`=:userId');
    $stmt->execute([
      ':userId' => $this->userId
    ]);
    if ($userRow = $stmt->fetch(PDO::FETCH_OBJ)) {
      $mail = new Mail();
      $mail->setVerp('subscription', $this->userId, $config);
      $mail->setSender($config['emailSender']);
      $mail->setRecipient($userRow->email);
      $mail->setPlainText(file_get_contents('./config/EmailTemplate.txt'));
      $mail->setHtmlText(file_get_contents('./config/EmailTemplate.html'));
      $mail->setSubject(Language::getPhrase($mailName . '.subject', $userRow->language));

      $mail->assign('projectName', $config['projectName']);
      $mail->assign('projectURL', $config['projectURL']);
      $mail->assign('logoURL', $config['logoURL']);
      $mail->assign('year', date('Y'));
      $mail->assign('unsubscribeFooter', Language::getPhrase('subscriptionEmail.footer', $userRow->language));
      $mail->assign('body', Language::getPhrase($mailName . '.body', $userRow->language));

      foreach ($args as $key => $val) {
        $mail->assign($key, $val);
      }
      foreach ($dateArgs as $key => $val) {
        $mail->assign($key, date(Language::getPhrase($val[0], $userRow->language), $val[1]));
      }

      return $mail->send();
    } else {
      return false;
    }
  }

  public function deactivateSubscription($productId, $subscriptionId) {
    global $stripeConfig;

    $oldStatus = $this->getSubscriptionStatus();

    Database::get()
      ->prepare('UPDATE `user` SET `usergroupid`=:userGroupId WHERE `userid`=:userId')
      ->execute([
        ':userGroupId'          => $stripeConfig['fallbackUserGroupId'],
        ':userId'               => $this->userId
      ]);

    //! @todo Check productId/subscriptionId?
    Database::get()
      ->prepare('UPDATE `user_subscription` SET `status`=:status WHERE `userid`=:userId')
      ->execute([
        ':userId'               => $this->userId,
        ':status'               => self::STATUS_CANCELLED
      ]);

    if ($oldStatus !== self::STATUS_CANCELLED) {
      $this->sendNotificationEmail('subscriptionCancelledEmail', []);
    }
  }
}

function processSubscription($eventName, $subscription) {
  global $stripeConfig;

  $subscriptionId     = $subscription->id;
  $customerId         = $subscription->customer;
  $userId             = $subscription->metadata->cjoUserId;
  $priceId            = $subscription->plan->id;
  $status             = $subscription->status;
  $currentPeriodStart = $subscription->current_period_start;
  $currentPeriodEnd   = $subscription->current_period_end;
  $cancelAt           = $subscription->cancel_at;

  if (!$userId) {
    throw new InvalidArgumentException('Missing cjo user id in subscription metadata!');
  }

  if (empty($customerId)) {
    throw new InvalidArgumentException('Missing stripe customer id in metadata!');
  }

  $productId = null;
  foreach ($stripeConfig['products'] as $curProductId => $product) {
    if ($product['priceId'] === $priceId) {
      $productId = $curProductId;
      break;
    }
  }
  if ($productId === null) {
    throw new InvalidArgumentException('Failed to map priceId to product!');
  }

  $subscriptionManager = new SubscriptionManager($userId);
  if ($eventName == 'customer.subscription.created') {
    $subscriptionManager->updateStripeCustomerMapping($customerId);
  }

  //! @todo ONLY PROCESS IN ORDER?

  switch ($status) {
  case 'inactive':
    if ($eventName === 'customer.subscription.created') {

    }
    break;

  case 'active':
    $subscriptionManager->activateSubscription($productId, $subscriptionId, $currentPeriodStart, $currentPeriodEnd, $cancelAt);
    break;

  case 'canceled':
  case 'incomplete_expired':
  case 'unpaid':
    $subscriptionManager->deactivateSubscription($productId, $subscriptionId);
    break;

  //! @todo inactive + customer.subscription.created --> create pending subscription?
  }
}

// Handle the event
try {
  switch ($event->type) {
  case 'customer.subscription.created':
  case 'customer.subscription.deleted':
  case 'customer.subscription.updated':
    $subscription = $event->data->object;
    processSubscription($event->type, $subscription);
    break;

  case 'customer.deleted':
    $customer = $event->data->object;
    SubscriptionManager::deleteStripeCustomer($customer->id);
    break;

  default:
    // Unexpected event type
    echo 'Received unknown event type';
    break;
  }
} catch (Exception $ex) {
  echo $ex;
  http_response_code(500);
}
