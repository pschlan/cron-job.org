<?php
require_once('config/config.inc.php');

class Language {
  static $lang = [];

  public static function initialize() {
    global $config;

    foreach ($config['languages'] as $langCode) {
      $lang = [];
      include('./languages/' . preg_replace('/[^a-z]/', '', $langCode) . '.php');
      self::$lang[$langCode] = $lang;
    }
  }

  public static function getPhrase($key, $language) {
    global $config;
    
    if (!isset(self::$lang[$language]) || !isset(self::$lang[$language][$key])) {
      if (isset(self::$lang[$config['fallbackLanguage']][$key])) {
        return self::$lang[$config['fallbackLanguage']][$key];
      } else {
        return '$UNKNOWN:' . $key;
      }
    }

    return self::$lang[$language][$key];
  }
}
