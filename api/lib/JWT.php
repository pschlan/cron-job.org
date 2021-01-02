<?php
class InvalidJWTTokenException extends Exception {}
class UnsupportedJWTTokenException extends Exception {}

class JWT {
  private static function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
  }
  
  private static function base64UrlDecode($data) {
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
  }

  static function encode($payload, $secret) {
    $header = array(
      'alg' => 'HS256',
      'typ' => 'JWT'
    );

    $encodedHeader = self::base64UrlEncode(json_encode($header));
    $encodedPayload = self::base64UrlEncode(json_encode($payload));
    $encodedHash = self::base64UrlEncode(hash_hmac('sha256', implode('.', [$encodedHeader, $encodedPayload]), $secret, true));

    return implode('.', [$encodedHeader, $encodedPayload, $encodedHash]);
  }

  static function decode($payload, $secret) {
    $components = explode('.', $payload);
    if (count($components) != 3) {
      throw new InvalidJWTTokenException('Invalid JWT token.');
    }
    [$encodedHeader, $encodedPayload, $encodedHash] = $components;

    $decodedHeader = json_decode(self::base64UrlDecode($encodedHeader));
    if (!is_object($decodedHeader) || $decodedHeader->typ !== 'JWT') {
      throw new InvalidJWTTokenException('Invalid JWT token.');
    }
    if ($decodedHeader->alg !== 'HS256') {
      throw new UnsupportedJWTTokenException('Unsupported JWT algorithm.');
    }

    $providedRawHash = self::base64UrlDecode($encodedHash);
    $expectedRawHash = hash_hmac('sha256', implode('.', [$encodedHeader, $encodedPayload]), $secret, true);
    if (!hash_equals($expectedRawHash, $providedRawHash)) {
      throw new InvalidJWTTokenException('Invalid JWT token.');
    }

    $decodedPayload = json_decode(self::base64UrlDecode($encodedPayload));
    return $decodedPayload;
  }
}
