<?php
$lang = [
  'changeEmail.footer' => 'Sie erhalten diese E-Mail, weil jemand versucht hat, einen Account mit Ihrer E-Mail-Adresse zu verbinden. Falls Sie dies nicht selbst veranlasst haben, ignorieren und löschen Sie die E-Mail bitte.',
  'changeEmail.subject' => '$projectName: Geänderte E-Mail-Adresse bestätigen',
  'changeEmail.body' =>
      'Hi,' . "\n\n"
    . 'Sie haben eine Änderung Ihrer E-Mail-Adresse Ihres $projectName-Accounts auf $newEmail angefordert.' . "\n\n"
    . 'Bitte klicken Sie auf den folgenden Link, um die Änderung der E-Mail-Adresse zu bestätigen.' . "\n\n"
    . '{link|$confirmationLink|E-Mail-Adresse bestätigen}' . "\n\n"
    . 'Falls Sie diese Änderung nicht selbst veranlasst haben, klicken Sie den Link bitte NICHT, sondern ignorieren und löschen Sie diese E-Mail.' . "\n\n"
    . 'Viele Grüße' . "\n\n"
    . '$projectName',
  'lostPasswordEmail.footer' => 'Sie erhalten diese E-Mail, weil jemand versucht hat, das Passwort Ihres Accounts zurückzusetzen. Falls Sie dies nicht selbst veranlasst haben, ignorieren und löschen Sie die E-Mail bitte.',
  'lostPasswordEmail.subject' => '$projectName: Password zurücksetzen',
  'lostPasswordEmail.body' =>
      'Hi,' . "\n\n"
    . 'Sie haben die Zurücksetzung des Passworts Ihres $projectName-Accounts angefordert.' . "\n\n"
    . 'Bitte klicken Sie auf den folgenden Link, um ein neues Passwort zu vergeben.' . "\n\n"
    . '{link|$confirmationLink|Passwort zurücksetzen}' . "\n\n"
    . 'Falls Sie dies nicht selbst veranlasst haben, klicken Sie den Link bitte NICHT, sondern ignorieren und löschen Sie diese E-Mail.' . "\n\n"
    . 'Viele Grüße' . "\n\n"
    . '$projectName',
  'signupEmail.footer' => 'Sie erhalten diese E-Mail, weil jemand einen Account mit Ihrer E-Mail-Adresse registriert hat. Falls Sie dies nicht selbst veranlasst haben, ignorieren und löschen Sie die E-Mail bitte.',
  'signupEmail.subject' => '$projectName: Account aktivieren',
  'signupEmail.body' =>
      'Hi,' . "\n\n"
    . 'vielen Dank für Ihre Anmeldung bei $projectName!' . "\n\n"
    . 'Bitte klicken Sie den folgenden Link, um Ihren Account zu aktivieren' . "\n\n"
    . '{link|$confirmationLink|Account aktivieren}' . "\n\n"
    . 'Falls Sie dies nicht selbst veranlasst haben, klicken Sie den Link bitte NICHT, sondern ignorieren und löschen Sie diese E-Mail.' . "\n\n"
    . 'Viele Grüße' . "\n\n"
    . '$projectName'
];
