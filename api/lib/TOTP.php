<?php
class TOTP {
  const BASE32CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const CODE_LENGTH = 6;

  public static function generateSecret($bits = 120) {
    if (($bits % 8) != 0 || ($bits % 5) != 0 || $bits < 80 || $bits > 640) {
      throw new Exception('Invalid secret bit length: ' . $bits);
    }
    return random_bytes($bits / 8);
  }

  public static function verifyCode($secret, $code, &$timeslotOut, $maxOffset = 1) {
    if (strlen($code) != self::CODE_LENGTH) {
      return false;
    }

    $timeSlot = floor(time() / 30) - $maxOffset;
    for ($i = 0; $i < 2 * $maxOffset; ++$i, ++$timeSlot) {
      $expectedCode = self::generateCode($secret, $timeSlot);
      if (hash_equals($expectedCode, $code)) {
        $timeslotOut = $timeSlot;
        return true;
      }
    }

    return false;
  }

  public static function generateCode($secret, $timeSlot) {
    $hmac = hash_hmac('SHA1', pack('J', $timeSlot), $secret, true);
    $value = unpack('Nval', substr($hmac, ord(substr($hmac, -1)) & 0x0F, 4))['val'] & 0x7FFFFFFF;
    $modulo = pow(10, self::CODE_LENGTH);
    return str_pad($value % $modulo, self::CODE_LENGTH, '0', STR_PAD_LEFT);
  }

  public static function base32Encode($data) {
    $dataLengthBits = strlen($data) * 8;
    $result = '';

    for ($i = 0; $i < $dataLengthBits; $i += 5) {
      $byteIndex = intval($i / 8);
      $c = ord($data[$byteIndex]);

      $offset = $i % 8;
      $char = 0;

      if ($offset <= 3) {
        $char = $c >> (3 - $offset);
      } else {
        $char = $c << ($offset - 3);

        if ($i+1 < $dataLengthBits) {
          $char |= ord($data[$byteIndex + 1]) >> (8 - ($offset - 3));
        }
      }

      $char &= 0x1F;
      if ($dataLengthBits - $i < 5) {
        $char &= 0x1F << (5 + $i - $dataLengthBits);
      }

      $result .= self::BASE32CHARS[$char];
    }

    return $result;
  }
}
