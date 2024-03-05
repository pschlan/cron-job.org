<?php
date_default_timezone_set('UTC');

$config = array(
  //! @note Add your master node's MySQL login information here.
  'db' => array(
    'host'      => 'HOSTNAME',
    'user'      => 'USERNAME',
    'password'  => 'PASSWORD',
    'database'  => 'DATABASE'
  ),

  //! @note If you want to use rate limiting, supply login to a redis
  //!       instance here.
  //!       redis is also required to enable the test run feature.
  //'redis' => array(
  //  'host'      => 'localhost',
  //  'port'      => 6379,
  //  'auth'      => false
  //),

  //! @note Adjust project name, domains and URLs accordingly.
  'projectName'                     => 'cron-job.org OSS',
  'projectURL'                      => 'https://example.com/',
  'frontendURL'                     => 'https://console.example.com/',
  'statusPageDomain'                => 'status.example.com',

  //! @note Origins which are allowed to access the API as the console including the 'Remember me' feature.
  'allowCredentialsOrigins'         => ['https://console.example.com'],

  //! @note The logo is used in sent HTML emails.
  'logoURL'                         => 'https://example.com/img/logo.png',

  //! @note Adjust the email sender here - the first value is the sender name,
  //!       the second one is the sender email address.
  'emailSender'                     => ['cjo OSS', 'no-reply@example.com'],

  //! @note Adjust return path here. Use %s for VERP payload to auto-process bounces.
  'emailReturnPath'                 => 'bounce+%s@bounces.example.com',

  //! @note Replace the following secrets with random, unique, non-guessable
  //!       values of at least 32 characters. They are used to compute signatures
  //!       for JWT and other tokens and need to remain strictly confidential.
  'emailVerpSecret'                 => 'PLACE_RANDOM_STRING_HERE',
  'sessionTokenSecret'              => 'PLACE_RANDOM_STRING_HERE',
  'emailVerificationTokenSecret'    => 'PLACE_RANDOM_STRING_HERE',
  'lostPasswordTokenSecret'         => 'PLACE_RANDOM_STRING_HERE',
  'accountConfirmationTokenSecret'  => 'PLACE_RANDOM_STRING_HERE',

  //! @note Put your reCAPTCHA secret key here. Set to null to disable reCAPTCHA.
  'recaptchaSecretKey'              => 'PLACE_RECAPTCHA_SECRET_KEY_HERE',

  //! @note If you want to use Yubico OTP for Yubikey MFA devices, adjust this.
  'yubicoOTP' => array(
    'enable'      => false,
    'clientId'    => 'PLACE_CLIENT_ID_HERE',
    'secretKey'   => 'PLACE_SECRET_KEY_HERE'
  ),

  /****************************************************************************************
   ******** The following settings might be kept as is. Customization is optional. ********
   ****************************************************************************************/

  //! @note Token lifetimes (in seconds) may be customized here.
  'sessionTokenLifetime'            => 15 * 60,
  'emailVerificationTokenLifetime'  => 3 * 86400,
  'lostPasswordTokenLifetime'       => 3 * 86400,
  'accountConfirmationTokenLifetime' => 3 * 86400,
  'refreshTokenValiditySeconds'     => 365 * 86400,

  //! @note Minimum session token refresh interval
  'sessionTokenRefreshInterval'     => 5 * 60,

  //! @note The minimum password length can be configured here, and should match
  //!       the value in the frontend config.
  'minPasswordLength'               => 8,
  'passwordSaltLength'              => 16,
  'refreshTokenLength'              => 64,

  //! @note This is the length of auto-generated unique IDs oft status pages.
  'statusPageUniqueIdLength'        => 8,

  //! @note The allowed MIME typed for logos can be configured here. (Might need
  //!       changes in frontend code as well.)
  'allowdLogoMimeTypes'             => ['image/png'],

  //! @note The language to be used as a fallback if the language code provided
  //!       by the frontend cannot be found.
  'fallbackLanguage'                => 'en',

  //! @note List of supported languages. When adding new language file, be sure
  //!       to add the new language code here.
  'languages'                       => ['en', 'de', 'fr', 'zh_TW', 'ro', 'pl'],

  //! @note Lifetime for test run meta data in redis cache.
  'testRunLifetime'                 => 5 * 60
);
