<?php
class PaddleAPI {
  public static function getSubscription($subscriptionId) {
    global $paddleConfig;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $paddleConfig['apiEndpoint'] . 'subscriptions/' . urlencode($subscriptionId));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      'Authorization: Bearer ' . $paddleConfig['apiKey']
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);
    curl_close($ch);

    if (!$output) {
      return false;
    }

    $response = json_decode($output);
    return $response;
  }

  public static function createPortalSession($customerId) {
    global $paddleConfig;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $paddleConfig['apiEndpoint'] . 'customers/' . urlencode($customerId) . '/portal-sessions');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      'Authorization: Bearer ' . $paddleConfig['portalApiKey'],
      'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
    $output = curl_exec($ch);
    curl_close($ch);

    if (!$output) {
      return false;
    }

    $response = json_decode($output);
    return $response;
  }
}
