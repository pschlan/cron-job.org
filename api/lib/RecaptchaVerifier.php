<?php
class RecaptchaVerifier {
  const SERVICE_URL = 'https://www.google.com/recaptcha/api/siteverify';

  public static function verify($secret, $response) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, self::SERVICE_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
      'secret'    => $secret,
      'response'  => $response
    ]));
    $output = curl_exec($ch);
    curl_close($ch);

    if (!$output) {
      return false;
    }

    $response = json_decode($output);
    return !!$response->success;
  }
}
