<?php
class YubicoOTP {
  const SERVICE_URL = 'https://api.yubico.com/wsapi/2.0/verify';
  const NONCE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  public static function getPublicIdFromOTP($otp) {
    $otp = trim($otp);

    if (strlen($otp) != 44) {
      return false;
    }

    return substr($otp, 0, 12);
  }

  public static function verifyCode($publicId, $otp) {
    global $config;

    $publicId = trim($publicId);
    $otp = trim($otp);

    if (strlen($publicId) != 12) {
      return false;
    }

    if (strlen($otp) != 44) {
      return false;
    }

    $nonce = self::generateNonce();

    $fields = [
      'id'      => $config['yubicoOTP']['clientId'],
      'nonce'   => $nonce,
      'otp'     => $otp
    ];
    $query = http_build_query($fields);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, self::SERVICE_URL . '?' . $query);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);
    curl_close($ch);

    $result = self::parseResult($output);
    if (!hash_equals(self::computeSignature($result), $result['h'])) {
      throw new Exception('Failed to verify YubicoOTP response signature!');
    }

    if ($result['nonce'] !== $nonce) {
      throw new Exception('YubicoOTP service returned unexpected nonce!');
    }

    return $result['status'] === 'OK';
  }

  private static function generateNonce($length = 32) {
    $result = '';
    for ($i = 0; $i < $length; ++$i) {
      $result .= self::NONCE_CHARS[ random_int(0, strlen(self::NONCE_CHARS) - 1) ];
    }
    return $result;
  }

  private static function parseResult($data) {
    $result = [];
    foreach (explode("\n", $data) as $line) {
      $eqPos = strpos($line, '=');
      if ($eqPos === false) {
        continue;
      }
      $key = substr($line, 0, $eqPos);
      $value = rtrim(substr($line, $eqPos + 1));
      $result[$key] = $value;
    }
    return $result;
  }

  private static function computeSignature($data) {
    global $config;

    $keys = array_keys($data);
    sort($keys);

    $elements = [];
    foreach ($keys as $key) {
      if ($key != 'h') {
        $elements[] = $key . '=' . $data[$key];
      }
    }

    return base64_encode(hash_hmac('sha1', implode('&', $elements),
      base64_decode($config['yubicoOTP']['secretKey']),
      true));
  }
}
