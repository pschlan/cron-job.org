<?php
$lang = [
  'changeEmail.footer' => 'You are receiving this email because someone tried to connect an account to your email address. In case you did not request this, please ignore and delete this email.',
  'changeEmail.subject' => '$projectName: Confirm changed email address',
  'changeEmail.body' =>
      'Hi,' . "\n\n"
    . 'you have requested to change the email address of your $projectName account to $newEmail.' . "\n\n"
    . 'Please click the following link to confirm the change of your email address.' . "\n\n"
    . '{link|$confirmationLink|Confirm email address}' . "\n\n"
    . 'In case you did not request this change, please DO NOT click the confirmation link and instead ignore and delete this email.' . "\n\n"
    . 'Best regards,' . "\n\n"
    . '$projectName',
  'lostPasswordEmail.footer' => 'You are receiving this email because someone tried to reset the password of your account. In case you did not request this, please ignore and delete this email.',
  'lostPasswordEmail.subject' => '$projectName: Reset password',
  'lostPasswordEmail.body' =>
      'Hi,' . "\n\n"
    . 'you have requested to reset the password of your $projectName account.' . "\n\n"
    . 'Please click the following link to reset your password.' . "\n\n"
    . '{link|$confirmationLink|Reset password}' . "\n\n"
    . 'In case you did not request this change, please DO NOT click the link and instead ignore and delete this email.' . "\n\n"
    . 'Best regards,' . "\n\n"
    . '$projectName',
  'signupEmail.footer' => 'You are receiving this email because someone signed up with your email address. In case you did not request this, please ignore and delete this email.',
  'signupEmail.subject' => '$projectName: Activate account',
  'signupEmail.body' =>
      'Hi,' . "\n\n"
    . 'thanks for signing up at $projectName!' . "\n\n"
    . 'Please click the following link to activate your account.' . "\n\n"
    . '{link|$confirmationLink|Activate account}' . "\n\n"
    . 'In case you did not sign up, please DO NOT click the link and instead ignore and delete this email.' . "\n\n"
    . 'Best regards,' . "\n\n"
    . '$projectName'
];
