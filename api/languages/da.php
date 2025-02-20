<?php
$lang = [
  'changeEmail.footer' => 'Du modtager denne e-mail, fordi nogen har forsøgt at forbinde en konto til din e-mailadresse. Hvis du ikke har anmodet om dette, skal du blot ignorere og slette denne e-mail.',
  'changeEmail.subject' => '$projectName: Bekræft ændret e-mailadresse',
  'changeEmail.body' =>
      'Hej,' . "\n\n"
    . 'du har anmodet om at ændre e-mailadressen til din $projectName-konto til $newEmail.' . "\n\n"
    . 'Klik venligst på følgende link for at bekræfte ændringen af din e-mailadresse.' . "\n\n"
    . '{link|$confirmationLink|Bekræft e-mailadresse}' . "\n\n"
    . 'Hvis du ikke har anmodet om denne ændring, skal du IKKE klikke på bekræftelseslinket, men blot ignorere og slette denne e-mail.' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'lostPasswordEmail.footer' => 'Du modtager denne e-mail, fordi nogen har forsøgt at nulstille adgangskoden til din konto. Hvis du ikke har anmodet om dette, skal du blot ignorere og slette denne e-mail.',
  'lostPasswordEmail.subject' => '$projectName: Nulstil adgangskode',
  'lostPasswordEmail.body' =>
      'Hej,' . "\n\n"
    . 'du har anmodet om at nulstille adgangskoden til din $projectName-konto.' . "\n\n"
    . 'Klik venligst på følgende link for at nulstille din adgangskode.' . "\n\n"
    . '{link|$confirmationLink|Nulstil adgangskode}' . "\n\n"
    . 'Hvis du ikke har anmodet om denne ændring, skal du IKKE klikke på linket, men blot ignorere og slette denne e-mail.' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'signupEmail.footer' => 'Du modtager denne e-mail, fordi nogen har tilmeldt sig med din e-mailadresse. Hvis du ikke har anmodet om dette, skal du blot ignorere og slette denne e-mail.',
  'signupEmail.subject' => '$projectName: Aktiver konto',
  'signupEmail.body' =>
      'Hej,' . "\n\n"
    . 'tak fordi du har tilmeldt dig $projectName!' . "\n\n"
    . 'Klik venligst på følgende link for at aktivere din konto.' . "\n\n"
    . '{link|$confirmationLink|Aktiver konto}' . "\n\n"
    . 'Hvis du ikke har tilmeldt dig, skal du IKKE klikke på linket, men blot ignorere og slette denne e-mail.' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'subscriptionEmail.footer' => 'Du modtager denne e-mail, fordi din abonnementsstatus er blevet ændret. Hvis du har spørgsmål, er du velkommen til at kontakte vores supportteam.',
  'subscriptionActivatedEmail.subject' => '$projectName: Abonnement aktiveret',
  'subscriptionActivatedEmail.body' =>
      'Hej,' . "\n\n"
    . 'mange tak for din støtte til $projectName og for at gøre vores service mulig!' . "\n\n"
    . 'Dit abonnement er nu blevet aktiveret. I sjældne tilfælde kan abonnementsstatus ikke vises i din konto med det samme. Hvis det sker, prøv venligst at logge ind igen.' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'subscriptionCancelledEmail.subject' => '$projectName: Abonnement afsluttet',
  'subscriptionCancelledEmail.body' =>
      'Hej,' . "\n\n"
    . 'dit abonnement hos $projectName er nu afsluttet.' . "\n\n"
    . 'Tusind tak for din støtte til $projectName!' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'subscriptionExpiringEmail.subject' => '$projectName: Abonnement opsiges',
  'subscriptionExpiringEmail.body' =>
      'Hej,' . "\n\n"
    . 'som anmodet opsiger vi dit abonnement hos $projectName med virkning fra $cancelAt.' . "\n\n"
    . 'Tusind tak for din støtte til $projectName!' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'paymentFailedEmail.subject' => '$projectName: Mislykket abonnementsbetaling',
  'paymentFailedEmail.body' =>
      'Hej,' . "\n\n"
    . 'vores betalingsudbyder har rapporteret en mislykket betaling for dit $projectName-abonnement.' . "\n\n"
    . 'Tjek venligst din betalingsmetode under Indstillinger i din konsol på https://console.cron-job.org/ for at sikre, at dit abonnement kan fornyes korrekt.' . "\n\n"
    . 'Hvis du har spørgsmål eller bekymringer, er du velkommen til at kontakte os.' . "\n\n"
    . 'Venlig hilsen,' . "\n\n"
    . '$projectName',

  'dateFormat' => 'd/m/Y'
];
