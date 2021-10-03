<?php
require_once('config/config.inc.php');
require_once('lib/Database.php');
require_once('lib/AccountConfirmationToken.php');
require_once('lib/EmailVerificationToken.php');
require_once('lib/LostPasswordToken.php');
require_once('lib/SessionToken.php');
require_once('lib/JWT.php');
require_once('lib/Mail.php');
require_once('lib/Language.php');
require_once('lib/Exceptions.php');

class WrongPasswordException extends Exception {}
class UserNotActivatedException extends Exception {}
class UserBannedException extends Exception {}
class AccountNotFoundException extends Exception {}
class EmailAddresInUseException extends Exception {}
class FailedToDeleteAccountException extends Exception {}
class InvalidEmailAddressException extends Exception {}

class UserProfile {
  public const STATUS_CREATED = 0;
  public const STATUS_VERIFIED = 1;
  public const STATUS_LOCKED = 2;

  public $firstName;
  public $lastName;
  public $email;
  public $signupDate;
  public $userGroupId;

  function __construct() {
    $this->signupDate = intval($this->signupDate);
    $this->userGroupId = intval($this->userGroupId);
  }
}

class UserGroup {
  public $userGroupId;
  public $title;
  public $maxStatusPages;
  public $maxStatusPageMonitors;
  public $maxStatusPageDomains;
  public $requestTimeout;
  public $requestMaxSize;
  public $maxFailures;

  function __construct() {
    $this->userGroupId = intval($this->userGroupId);
    $this->maxStatusPages = intval($this->maxStatusPages);
    $this->maxStatusPageMonitors = intval($this->maxStatusPageMonitors);
    $this->maxStatusPageDomains = intval($this->maxStatusPageDomains);
    $this->requestTimeout = intval($this->requestTimeout);
    $this->requestMaxSize = intval($this->requestMaxSize);
    $this->maxFailures = intval($this->maxFailures);
  }
}

class RefreshTokenHandler {
  public function validateRefreshToken($refreshToken, $userId, $userGroupId) {
    if (empty($refreshToken) || $userId <= 0) {
      return false;
    }

    $stmt = Database::get()->prepare('SELECT `refreshtoken`.`userid` AS `userId`, `refreshtoken`.`expires` AS `expires`, `user`.`usergroupid` AS `userGroupId`, `user`.`status` AS `userStatus` FROM `refreshtoken` '
      . 'INNER JOIN `user` ON `user`.`userid`=`refreshtoken`.`userid` WHERE `refreshtoken`.`token`=:token');
    $stmt->execute([':token' => $refreshToken]);

    if ($tokenRow = $stmt->fetch(PDO::FETCH_OBJ)) {
      if (intval($tokenRow->userId) === intval($userId)
          && intval($tokenRow->userGroupId) === intval($userGroupId)
          && $tokenRow->expires > time()
          && $tokenRow->userStatus == UserProfile::STATUS_VERIFIED) {
        return true;
      }
    }

    return false;
  }

  public function mayRefreshSessionToken($userId, $userGroupId) {
    if ($userId <= 0) {
      return false;
    }

    $stmt = Database::get()->prepare('SELECT `status` AS `userStatus`, `usergroupid` AS `userGroupId` FROM `user` '
      . 'WHERE `user`.`userid`=:userId');
    $stmt->execute([':userId' => $userId]);

    if ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
      if ($row->userStatus == UserProfile::STATUS_VERIFIED
          && intval($row->userGroupId) === intval($userGroupId)) {
        return true;
      }
    }

    return false;
  }
}

class UserManager {
  private $authToken;

  const PASSWORD_SALT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  public static function getRefreshTokenHandler() {
    return new RefreshTokenHandler();
  }

  public function getProfile() {
    $stmt = Database::get()->prepare('SELECT `firstname` AS `firstName`, `lastname` AS `lastName`, `timezone`, `email`, `signup_date` AS `signupDate`, `newsletter_subscribe` AS `newsletterSubscribe`,`usergroupid` AS `userGroupId` FROM `user` WHERE `userid`=:userId');
    $stmt->setFetchMode(PDO::FETCH_CLASS, UserProfile::class);
    $stmt->execute(array(':userId' => $this->authToken->userId));
    return $stmt->fetch();
  }

  public function updateProfile($profile) {
    Database::get()
      ->prepare('UPDATE `user` SET `firstname`=:firstName, `lastname`=:lastName, `timezone`=:timezone WHERE `userid`=:userId')
      ->execute(array(
        'firstName'   => $profile->firstName,
        'lastName'    => $profile->lastName,
        'timezone'    => $profile->timezone,
        'userId'      => $this->authToken->userId
      ));
    if (isset($profile->newsletterSubscribe) && in_array($profile->newsletterSubscribe, ['yes', 'no', 'undefined'])) {
      $this->updateNewsletterSubscribe($profile->newsletterSubscribe);
    }
    return true;
  }

  public function getGroup() {
    $stmt = Database::get()->prepare('SELECT `usergroupid` AS `userGroupId`, `title`, `max_status_pages` AS `maxStatusPages`, `max_status_page_monitors` AS `maxStatusPageMonitors`, `max_status_page_domains` AS `maxStatusPageDomains`, `request_timeout` AS `requestTimeout`, `request_max_size` AS `requestMaxSize`, `max_failures` AS `maxFailures` '
      . 'FROM `usergroup` '
      . 'WHERE `usergroup`.`usergroupid`=:userGroupId');
    $stmt->execute(array(':userGroupId' => $this->authToken->userGroupId));
    $stmt->setFetchMode(PDO::FETCH_CLASS, UserGroup::class);
    return $stmt->fetch();
  }

  public static function login($email, $password, $rememberMe, $language) {
    $stmt = Database::get()->prepare('SELECT '
      . '`userid` AS `userId`, `password`, `password_salt` AS `passwordSalt`, `status`, `usergroupid` AS `userGroupId` '
      . 'FROM `user` WHERE `email`=:email');
    $stmt->execute(array(':email' => $email));

    if ($userRow = $stmt->fetch(PDO::FETCH_OBJ)) {
      if (self::checkPassword($userRow, $password)) {
        if ($userRow->status == UserProfile::STATUS_VERIFIED) {
          Database::get()
            ->prepare('UPDATE `user` SET `lastlogin_lang`=:lastLoginLang, `lastlogin_date`=:lastLoginDate, `lastlogin_ip`=:lastLoginIP WHERE `userid`=:userId')
            ->execute([
              ':lastLoginLang'    => $language,
              ':lastLoginDate'    => time(),
              ':lastLoginIP'      => $_SERVER['REMOTE_ADDR'],
              ':userId'           => $userRow->userId
            ]);

          if ($rememberMe) {
            self::setRefreshTokenCookie(self::createRefreshToken($userRow->userId, $_SERVER['HTTP_USER_AGENT']));
          }

          return (object) [
            'token' => (new SessionToken($userRow->userId, $userRow->userGroupId))->toJwt()
          ];
        } else if ($userRow->status == UserProfile::STATUS_LOCKED) {
          throw new UserBannedException();
        } else if ($userRow->status == UserProfile::STATUS_CREATED) {
          throw new UserNotActivatedException();
        }
      }
    }

    return false;
  }

  public function logout() {
    if (isset($_COOKIE['refreshToken']) && !empty($_COOKIE['refreshToken'])) {
      $stmt = Database::get()->prepare('DELETE FROM `refreshtoken` WHERE `token`=:token AND `userId`=:userId');
      $stmt->execute([
        ':token'  => $_COOKIE['refreshToken'],
        ':userId' => $this->authToken->userId
      ]);
    }
    self::setRefreshTokenCookie('');
  }

  private static function setRefreshTokenCookie($value) {
    global $config;

    setcookie('refreshToken', $value, [
      'expires' => $value === '' ? time() - $config['refreshTokenValiditySeconds'] : time() + $config['refreshTokenValiditySeconds'],
      'secure' => true,
      'httponly' => true,
      'samesite' => 'Strict',
      'path' => '/'
    ]);
  }

  private function createRefreshToken($userId, $device) {
    global $config;

    $token = self::generateToken($config['refreshTokenLength']);
    $expires = time() + $config['refreshTokenValiditySeconds'];

    $stmt = Database::get()->prepare('INSERT INTO `refreshtoken`(`token`, `userid`, `device`, `expires`) VALUES(:token, :userId, :device, :expires)');
    $stmt->execute([
      ':token'    => $token,
      ':userId'   => $userId,
      ':device'   => $device,
      ':expires'  => $expires
    ]);

    return $token;
  }

  public function changeEmail($newEmail, $language) {
    global $config;

    $existingUserId = $this->getUserIdByEmail($newEmail);
    if ($existingUserId !== false) {
      if ($existingUserId == $this->authToken->userId) {
        return true;
      }
      throw new EmailAddresInUseException();
    }

    $verificationToken = new EmailVerificationToken($this->authToken->userId, $newEmail);

    $mail = new Mail();
    $mail->setSender($config['emailSender']);
    $mail->setRecipient($newEmail);
    $mail->setPlainText(file_get_contents('./config/EmailTemplate.txt'));
    $mail->setHtmlText(file_get_contents('./config/EmailTemplate.html'));
    $mail->setSubject(Language::getPhrase('changeEmail.subject', $language));

    $mail->assign('projectName', $config['projectName']);
    $mail->assign('projectURL', $config['projectURL']);
    $mail->assign('logoURL', $config['logoURL']);
    $mail->assign('year', date('Y'));
    $mail->assign('unsubscribeFooter', Language::getPhrase('changeEmail.footer', $language));
    $mail->assign('body', Language::getPhrase('changeEmail.body', $language));
    $mail->assign('confirmationLink', $config['frontendURL'] . 'confirmEmailChange/' . urlencode($verificationToken->toJwt()));
    $mail->assign('newEmail', $newEmail);

    return $mail->send();
  }

  public static function confirmEmailChange($token) {
    $token = EmailVerificationToken::fromJwt($token);
    if ($token->isExpired()) {
      throw new TokenExpiredException();
    }

    Database::get()->beginTransaction();

    $existingUserId = self::getUserIdByEmail($token->email);
    if ($existingUserId !== false) {
      Database::get()->rollbackTransaction();
      throw new EmailAddresInUseException();
    }

    Database::get()
      ->prepare('UPDATE `user` SET `email`=:email WHERE `userid`=:userId')
      ->execute(['userId' => intval($token->userId), 'email' => $token->email]);

    Database::get()->commitTransaction();

    return true;
  }

  public function updateLanguage($language) {
    Database::get()
      ->prepare('UPDATE `user` SET `lastlogin_lang`=:language WHERE `userid`=:userId')
      ->execute([
        ':language'   => $language,
        ':userId'     => $this->authToken->userId
      ]);
    return true;
  }

  public function updateNewsletterSubscribe($newsletterSubscribe) {
    Database::get()
      ->prepare('UPDATE `user` SET `newsletter_subscribe`=:newsletterSubscribe WHERE `userid`=:userId')
      ->execute([
        ':newsletterSubscribe'  => $newsletterSubscribe,
        ':userId'               => $this->authToken->userId
      ]);
    return true;
  }

  private static function getUserIdByEmail($email) {
    $stmt = Database::get()->prepare('SELECT `userid` AS `userId` FROM `user` WHERE `email`=:email');
    $stmt->execute([':email' => $email]);
    if ($existingUserRow = $stmt->fetch(PDO::FETCH_OBJ)) {
      return intval($existingUserRow->userId);
    }
    return false;
  }

  private static function getUserPasswordSalt($userId) {
    $stmt = Database::get()->prepare('SELECT `password_salt` AS `passwordSalt` FROM `user` WHERE `userid`=:userId');
    $stmt->execute(['userId' => $userId]);
    if (!($userRow = $stmt->fetch(PDO::FETCH_OBJ))) {
      throw AccountNotFoundException();
    }
    return $userRow->passwordSalt;
  }

  public static function recoverPassword($email, $language) {
    global $config;

    $userId = self::getUserIdByEmail($email);
    if ($userId === false || $userId < 1) {
      throw new AccountNotFoundException();
    }

    $passwordSalt = self::getUserPasswordSalt($userId);
    $verificationToken = new LostPasswordToken($userId, $passwordSalt);

    $mail = new Mail();
    $mail->setSender($config['emailSender']);
    $mail->setRecipient($email);
    $mail->setPlainText(file_get_contents('./config/EmailTemplate.txt'));
    $mail->setHtmlText(file_get_contents('./config/EmailTemplate.html'));
    $mail->setSubject(Language::getPhrase('lostPasswordEmail.subject', $language));

    $mail->assign('projectName', $config['projectName']);
    $mail->assign('projectURL', $config['projectURL']);
    $mail->assign('logoURL', $config['logoURL']);
    $mail->assign('year', date('Y'));
    $mail->assign('unsubscribeFooter', Language::getPhrase('lostPasswordEmail.footer', $language));
    $mail->assign('body', Language::getPhrase('lostPasswordEmail.body', $language));
    $mail->assign('confirmationLink', $config['frontendURL'] . 'resetPassword/' . urlencode($verificationToken->toJwt()));

    return $mail->send();
  }

  public static function resetPassword($newPassword, $token) {
    $lostPwToken = LostPasswordToken::fromJwt($token);
    if ($lostPwToken->isExpired()) {
      throw new TokenExpiredException();
    }

    $oldPasswordSalt = self::getUserPasswordSalt($lostPwToken->userId);
    if ($oldPasswordSalt !== $lostPwToken->salt) {
      throw new TokenExpiredException();
    }

    $newSalt = self::generateSalt();
    $newHash = self::computePasswordHash($newPassword, $newSalt);

    $stmt = Database::get()->prepare('UPDATE `user` '
      . 'SET `password_salt`=:newPasswordSalt, `password`=:newPasswordHash '
      . 'WHERE `userid`=:userId');
    $stmt->execute([
      ':newPasswordSalt'    => $newSalt,
      ':newPasswordHash'    => $newHash,
      ':userId'             => $lostPwToken->userId
    ]);

    return true;
  }

  public static function createAccount($email, $firstName, $lastName, $password, $language, $timezone) {
    global $config;

    $userId = self::getUserIdByEmail($email);
    if ($userId !== false) {
      throw new EmailAddresInUseException();
    }

    $passwordSalt = self::generateSalt();
    $passwordHash = self::computePasswordHash($password, $passwordSalt);

    $stmt = Database::get()->prepare('INSERT INTO `user` '
      . '(`status`,`email`,`password`,`password_salt`,`firstname`,`lastname`,`signup_ip`,`signup_date`,`verification_date`,`timezone`,`lastlogin_lang`) '
      . 'VALUES(:status, :email, :passwordHash, :passwordSalt, :firstName, :lastName, :signupIp, :signupDate, 0, :timezone, :language)');
    $stmt->execute([
      ':status'       => UserProfile::STATUS_CREATED,
      ':email'        => $email,
      ':firstName'    => $firstName,
      ':lastName'     => $lastName,
      ':passwordHash' => $passwordHash,
      ':passwordSalt' => $passwordSalt,
      ':signupIp'     => $_SERVER['REMOTE_ADDR'],
      ':signupDate'   => time(),
      ':timezone'     => $timezone,
      ':language'     => $language
    ]);
    $userId = Database::get()->insertId();

    $confirmationToken = new AccountConfirmationToken($userId);

    $mail = new Mail();
    $mail->setSender($config['emailSender']);
    $mail->setRecipient($email);
    $mail->setPlainText(file_get_contents('./config/EmailTemplate.txt'));
    $mail->setHtmlText(file_get_contents('./config/EmailTemplate.html'));
    $mail->setSubject(Language::getPhrase('signupEmail.subject', $language));

    $mail->assign('projectName', $config['projectName']);
    $mail->assign('projectURL', $config['projectURL']);
    $mail->assign('logoURL', $config['logoURL']);
    $mail->assign('year', date('Y'));
    $mail->assign('unsubscribeFooter', Language::getPhrase('signupEmail.footer', $language));
    $mail->assign('body', Language::getPhrase('signupEmail.body', $language));
    $mail->assign('confirmationLink', $config['frontendURL'] . 'confirmAccount/' . urlencode($confirmationToken->toJwt()));

    return $mail->send();
  }

  public static function confirmAccount($token) {
    $confirmToken = AccountConfirmationToken::fromJwt($token);
    if ($confirmToken->isExpired()) {
      throw new TokenExpiredException();
    }

    $stmt = Database::get()->prepare('UPDATE `user` '
      . 'SET `status`=:newStatus, `verification_date`=:verificationDate '
      . 'WHERE `status`=:oldStatus AND `userid`=:userId');
    $stmt->execute([
      ':oldStatus'        => UserProfile::STATUS_CREATED,
      ':newStatus'        => UserProfile::STATUS_VERIFIED,
      ':verificationDate' => time(),
      ':userId'           => $confirmToken->userId
    ]);

    return $stmt->rowCount() === 1;
  }

  public function changePassword($oldPassword, $newPassword) {
    global $config;

    if (strlen($newPassword) < $config['minPasswordLength']) {
      return false;
    }

    $stmt = Database::get()->prepare('SELECT '
      . '`password`, `password_salt` AS `passwordSalt` '
      . 'FROM `user` WHERE `userid`=:userId');
    $stmt->execute([':userId' => $this->authToken->userId]);
    $userRow = $stmt->fetch(PDO::FETCH_OBJ);

    if (!$this->checkPassword($userRow, $oldPassword)) {
      throw new WrongPasswordException();
    }

    if ($newPassword === $oldPassword) {
      return true;
    }

    $newSalt = $this->generateSalt();
    $newHash = $this->computePasswordHash($newPassword, $newSalt);

    $stmt = Database::get()->prepare('UPDATE `user` '
      . 'SET `password_salt`=:newPasswordSalt, `password`=:newPasswordHash '
      . 'WHERE `userid`=:userId AND `password`=:oldPasswordHash AND `password_salt`=:oldPasswordSalt');
    $stmt->execute([
      ':newPasswordSalt'    => $newSalt,
      ':newPasswordHash'    => $newHash,
      ':oldPasswordSalt'    => $userRow->passwordSalt,
      ':oldPasswordHash'    => $userRow->password,
      ':userId'             => $this->authToken->userId
    ]);

    return true;
  }

  public function deleteAccount($emailAddress) {
    //! @todo There's a possible race condition here: A resource could be added while we're deleting the account, leading to dangling resources.

    require_once('StatusPage.php');
    require_once('Job.php');

    $profile = $this->getProfile();
    if (strtolower($profile->email) !== strtolower($emailAddress)) {
      throw new InvalidEmailAddressException();
    }

    $emailSalt = self::generateSalt();
    $emailHash = self::computePasswordHash(strtolower($emailAddress), $emailSalt);

    $stmt = Database::get()->prepare('REPLACE INTO `userdeletelog`(`userid`,`date`,`source`,`date_finished`,`email`,`email_salt`) VALUES(:userId, :date, :source, :dateFinished, :email, :emailSalt)');
    $stmt->execute([
      ':userId'             => $this->authToken->userId,
      ':date'               => time(),
      ':source'             => 'api',
      ':dateFinished'       => 0,
      ':email'              => $emailHash,
      ':emailSalt'          => $emailSalt
    ]);

    $statusPageManager = new StatusPageManager($this->authToken);
    $statusPages = $statusPageManager->getStatusPages();
    foreach ($statusPages->statusPages as $statusPage) {
      $statusPageManager->deleteStatusPage($statusPage->statusPageId, true);
    }

    $jobManager = new JobManager($this->authToken);
    if (!$jobManager->deleteAllJobs()) {
      throw new FailedToDeleteAccountException();
    }

    $stmt = Database::get()->prepare('DELETE FROM `job` WHERE `userid`=:userId');
    $stmt->execute([
      ':userId'             => $this->authToken->userId
    ]);

    $stmt = Database::get()->prepare('DELETE FROM `user` WHERE `userid`=:userId');
    $stmt->execute([
      ':userId'             => $this->authToken->userId
    ]);

    $stmt = Database::get()->prepare('UPDATE `userdeletelog` SET `date_finished`=:dateFinished WHERE `userid`=:userId');
    $stmt->execute([
      ':userId'             => $this->authToken->userId,
      ':dateFinished'       => time()
    ]);

    return true;
  }

  private static function checkPassword($userRow, $givenPassword) {
    $hash = self::computePasswordHash($givenPassword, $userRow->passwordSalt);
    return hash_equals($userRow->password, $hash);
  }

  private static function computePasswordHash($password, $salt) {
    return sha1(md5($password) . $salt);
  }

  private static function generateSalt() {
    global $config;
    return self::generateToken($config['passwordSaltLength']);
  }

  private static function generateToken($length) {
    $result = '';
    for ($i = 0; $i < $length; ++$i) {
      $result .= self::PASSWORD_SALT_CHARS[ random_int(0, strlen(self::PASSWORD_SALT_CHARS)-1) ];
    }
    return $result;
  }
}
