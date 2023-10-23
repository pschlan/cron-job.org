<?php
$lang = [
    'changeEmail.footer' => 'Vous recevez cet e-mail car quelqu\'un a essayé de connecter un compte à votre adresse e-mail. Si vous ne l\'avez pas demandé, veuillez ignorer et supprimer cet e-mail.',
    'changeEmail.subject' => '$projetName : Confirmer le changement d\'adresse e-mail',
    'changeEmail.body' =>
        'Bonjour,' . "\n\n"
        . 'vous avez demandé de changer l\'adresse électronique de votre compte $projectName en $newEmail.' . "\n\n"
        . 'Veuillez cliquer sur le lien suivant pour confirmer le changement de votre adresse électronique.' . "\n\n"
        . '{link|$confirmationLink|Confirm email address}' . "\n\n"
        . 'Si vous n\'avez pas demandé ce changement, veuillez NE PAS cliquer sur le lien de confirmation et ignorer et supprimer cet e-mail.' . "\n\n"
        . 'Meilleures salutations,' . "\n\n"
        . '$projectName',
    'lostPasswordEmail.footer' => 'Vous recevez cet e-mail car quelqu\'un a essayé de réinitialiser le mot de passe de votre compte. Si vous ne l\'avez pas demandé, veuillez ignorer et supprimer cet e-mail.',
    'lostPasswordEmail.subject' => '$projectName: Réinitialiser le mot de passe',
    'lostPasswordEmail.body' =>
        'Bonjour,' . "\n\n"
        . 'vous avez demandé à réinitialiser le mot de passe de votre compte $projectName.' . "\n\n"
        . 'Veuillez cliquer sur le lien suivant pour réinitialiser votre mot de passe.' . "\n\n"
        . '{link|$confirmationLink|Reset password}' . "\n\n"
        . 'Si vous n\'avez pas demandé ce changement, veuillez NE PAS cliquer sur le lien et ignorer et supprimer cet e-mail.' . "\n\n"
        . 'Meilleures salutations,' . "\n\n"
        . '$projectName',
    'signupEmail.footer' => 'Vous recevez cet e-mail car quelqu\'un s\'est inscrit avec votre adresse e-mail. Si vous ne l\'avez pas demandé, veuillez ignorer et supprimer cet e-mail.',
    'signupEmail.subject' => '$projectName : Activer le compte',
    'signupEmail.body' =>
        'Bonjour,' . "\n\n"
        . 'merci de vous inscrire à $projectName !' . "\n\n"
        . 'Veuillez cliquer sur le lien suivant pour activer votre compte.' . "\n\n"
        . '{link|$confirmationLink|Activate account}' . "\n\n"
        . 'Si vous ne vous êtes pas inscrit, veuillez NE PAS cliquer sur le lien et ignorer et supprimer cet e-mail.' . "\n\n"
        . 'Meilleures salutations,' . "\n\n"
        . '$projectName',
    'subscriptionEmail.footer' => 'Vous recevez cet e-mail car le statut de votre abonnement a changé. En cas de questions, n\'hésitez pas à prendre contact avec notre équipe d\'assistance.',
    'subscriptionActivatedEmail.subject' => '$projectName: Abonnement activé',
    'subscriptionActivatedEmail.body' =>
        'Bonjour,' . "\n\n"
        . 'Merci beaucoup de soutenir $projectName et de rendre notre service possible !' . "\n\n"
        . 'Votre abonnement a été activé avec succès. Dans de rares cas, il se peut que l\'état de l\'abonnement n\'apparaisse pas encore dans votre compte. Dans ce cas, veuillez vous reconnecter.' . "\n\n"
        . 'A propos : Vous pouvez trouver vos reçus et vos factures dans votre compte à Paramètres -> Gérer l\'abonnement.' . "\n\n"
        . 'Meilleures salutations,' . "\n\n"
        . '$projectName',
    'subscriptionCancelledEmail.subject' => '$projectName : Abonnement résilié',
    'subscriptionCancelledEmail.body' =>
        'Bonjour,' . "\n\n"
        . 'votre abonnement à $projectName a été résilié maintenant.' . "\n\n"
        . 'Merci beaucoup d\'avoir soutenu $projectName !' . "\n\n"
        . 'Meilleures salutations,' . "\n\n"
        . '$projectName',
    'subscriptionExpiringEmail.subject' => '$projectName : L\'abonnement est en cours de résiliation',
    'subscriptionExpiringEmail.body' =>
        'Bonjour,' . "\n\n"
        . 'comme vous l\'avez demandé, nous mettons fin à votre abonnement à $projectName à compter de $cancelAt.' . "\n\n"
        . 'Merci beaucoup d\'avoir soutenu $projectName !' . "\n\n"
        . 'Meilleures salutations,' . "\n\n"
        . '$projectName',
    'dateFormat' => 'd/m/Y'
];

