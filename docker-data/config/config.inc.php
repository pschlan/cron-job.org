<?php
date_default_timezone_set('UTC');

$config = array(
  'db' => array(
    'host'      => 'mysql-master',
    'user'      => getenv('MYSQL_USER'),
    'password'  => getenv('MYSQL_PASSWORD'),
    'database'  => getenv('MYSQL_DATABASE')
  ),
  'redis' => array(
    'host'      => 'redis',
    'port'      => 6379,
    'auth'      => false
  ),
  'projectName'                     => getenv('CJO_PROJECT_NAME'),
  'projectURL'                      => getenv('CJO_BASE_URL'),
  'logoURL'                         => getenv('CJO_BASE_URL') . 'logo.png',
  'frontendURL'                     => getenv('CJO_BASE_URL'),
  'statusPageDomain'                => null,
  'sessionTokenLifetime'            => 15 * 60,
  'sessionTokenSecret'              => getenv('CJO_SESSION_TOKEN_SECRET'),
  'sessionTokenRefreshInterval'     => 15 * 60,
  'emailVerificationTokenLifetime'  => 3 * 86400,
  'emailVerificationTokenSecret'    => getenv('CJO_EMAIL_VERIFICATION_TOKEN_SECRET'),
  'lostPasswordTokenLifetime'       => 3 * 86400,
  'lostPasswordTokenSecret'         => getenv('CJO_LOST_PASSWORD_TOKEN_SECRET'),
  'accountConfirmationTokenLifetime'=> 3 * 86400,
  'accountConfirmationTokenSecret'  => getenv('CJO_ACCOUNT_CONFIRMATION_TOKEN_SECRET'),
  'minPasswordLength'               => 8,
  'passwordSaltLength'              => 16,
  'statusPageUniqueIdLength'        => 8,
  'allowdLogoMimeTypes'             => ['image/png'],
  'fallbackLanguage'                => 'en',
  'languages'                       => ['en', 'de', 'fr'],
  'emailSender'                     => [getenv('CJO_PROJECT_NAME'), getenv('CJO_EMAIL_SENDER')],
  'emailReturnPath'                 => getenv('CJO_EMAIL_RETURN_PATH'),
  'emailVerpSecret'                 => getenv('CJO_VERP_SECRET'),
  'recaptchaSecretKey'              => null,
  'allowCredentialsOrigins'         => [substr(getenv('CJO_BASE_URL'), 0, -1)],
  'refreshTokenCookieDomain'        => '.' . getenv('CJO_DOMAIN'),
  'refreshTokenValiditySeconds'     => 365 * 86400,
  'refreshTokenLength'              => 64,
  'testRunLifetime'                 => 5 * 60,
  'yubicoOTP' => array(
    'enable'      => false,
    'clientId'    => 'PLACE_CLIENT_ID_HERE',
    'secretKey'   => 'PLACE_SECRET_KEY_HERE'
  )
);

if (empty($config['sessionTokenSecret'])) {
  throw new Exception('Please set CJO_SESSION_TOKEN_SECRET in .env!');
}
if (empty($config['emailVerificationTokenSecret'])) {
  throw new Exception('Please set CJO_EMAIL_VERIFICATION_TOKEN_SECRET in .env!');
}
if (empty($config['lostPasswordTokenSecret'])) {
  throw new Exception('Please set CJO_LOST_PASSWORD_TOKEN_SECRET in .env!');
}
if (empty($config['accountConfirmationTokenSecret'])) {
  throw new Exception('Please set CJO_ACCOUNT_CONFIRMATION_TOKEN_SECRET in .env!');
}
if (empty($config['emailVerpSecret'])) {
  throw new Exception('Please set CJO_VERP_SECRET in .env!');
}
