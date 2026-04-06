<?php
$lang = [
  'changeEmail.footer' => 'Has recibido este correo porque alguien intentó vincular una cuenta a tu dirección de correo electrónico. Si no has solicitado esto, ignora y elimina este correo.',
  'changeEmail.subject' => '$projectName: Confirma el cambio de dirección de correo electrónico',
  'changeEmail.body' =>
      'Hola,' . "\n\n"
    . 'has solicitado cambiar la dirección de correo electrónico de tu cuenta de $projectName a $newEmail.' . "\n\n"
    . 'Por favor, haz clic en el siguiente enlace para confirmar el cambio de tu dirección de correo electrónico.' . "\n\n"
    . '{link|$confirmationLink|Confirmar dirección de correo}' . "\n\n"
    . 'Si no solicitaste este cambio, NO hagas clic en el enlace y simplemente ignora y elimina este correo.' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'lostPasswordEmail.footer' => 'Has recibido este correo porque alguien intentó restablecer la contraseña de tu cuenta. Si no solicitaste esto, ignora y elimina este correo.',
  'lostPasswordEmail.subject' => '$projectName: Restablecer contraseña',
  'lostPasswordEmail.body' =>
      'Hola,' . "\n\n"
    . 'has solicitado restablecer la contraseña de tu cuenta de $projectName.' . "\n\n"
    . 'Por favor, haz clic en el siguiente enlace para restablecer tu contraseña.' . "\n\n"
    . '{link|$confirmationLink|Restablecer contraseña}' . "\n\n"
    . 'Si no solicitaste este cambio, NO hagas clic en el enlace y simplemente ignora y elimina este correo.' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'signupEmail.footer' => 'Has recibido este correo porque alguien se registró con tu dirección de correo electrónico. Si no solicitaste esto, ignora y elimina este correo.',
  'signupEmail.subject' => '$projectName: Activar cuenta',
  'signupEmail.body' =>
      'Hola,' . "\n\n"
    . '¡gracias por registrarte en $projectName!' . "\n\n"
    . 'Por favor, haz clic en el siguiente enlace para activar tu cuenta.' . "\n\n"
    . '{link|$confirmationLink|Activar cuenta}' . "\n\n"
    . 'Si no te registraste, NO hagas clic en el enlace y simplemente ignora y elimina este correo.' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'subscriptionEmail.footer' => 'Has recibido este correo porque el estado de tu suscripción cambió. Si tienes preguntas, no dudes en contactar con nuestro equipo de soporte.',
  'subscriptionActivatedEmail.subject' => '$projectName: Suscripción activada',
  'subscriptionActivatedEmail.body' =>
      'Hola,' . "\n\n"
    . '¡muchas gracias por apoyar $projectName y hacer posible nuestro servicio!' . "\n\n"
    . 'Tu suscripción ha sido activada con éxito. En casos raros, el estado de la suscripción podría no aparecer aún en tu cuenta. En ese caso, simplemente vuelve a iniciar sesión.' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'subscriptionCancelledEmail.subject' => '$projectName: Suscripción terminada',
  'subscriptionCancelledEmail.body' =>
      'Hola,' . "\n\n"
    . 'tu suscripción en $projectName ha sido terminada.' . "\n\n"
    . '¡Muchas gracias por haber apoyado $projectName!' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'subscriptionExpiringEmail.subject' => '$projectName: Suscripción a punto de finalizar',
  'subscriptionExpiringEmail.body' =>
      'Hola,' . "\n\n"
    . 'como has solicitado, estamos terminando tu suscripción en $projectName a partir del $cancelAt.' . "\n\n"
    . '¡Muchas gracias por haber apoyado $projectName!' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'paymentFailedEmail.subject' => '$projectName: Pago de suscripción fallido',
  'paymentFailedEmail.body' =>
      'Hola,' . "\n\n"
    . 'nuestro proveedor de pagos informó un fallo en el pago de tu suscripción de $projectName.' . "\n\n"
    . 'Por favor, revisa tu método de pago en Configuración en tu consola en https://console.cron-job.org/ para asegurar que la renovación de tu suscripción se pueda procesar correctamente.' . "\n\n"
    . 'Si tienes preguntas o dudas, no dudes en ponerte en contacto.' . "\n\n"
    . 'Saludos,' . "\n\n"
    . '$projectName',
  'dateFormat' => 'm/d/Y'
];