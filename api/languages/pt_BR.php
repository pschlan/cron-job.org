<?php
$lang = [
  'changeEmail.footer' => 'Você recebeu este email porque alguém tentou conectar uma conta ao seu endereço de email. Caso não tenha solicitado, por favor, ignore e exclua este email.',
  'changeEmail.subject' => '$projectName: Confirmar alteração de email',
  'changeEmail.body' =>
      'Olá,' . "\n\n"
    . 'você solicitou para alterar o endereço de email da sua conta $$projectName para $newEmail.' . "\n\n"
    . 'Por favor clique no link a seguir para confirmar a alteração do seu endereço de email.' . "\n\n"
    . '{link|$confirmationLink|Confirmar endereço de email}' . "\n\n"
    . 'Caso não tenha solicitado essa alteração, por favor, NÂO CLIQUE no link de confirmação e do contrário ignore e exclua este email.' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'confirmNotificationChannelEmail.footer' => 'Você recebeu este e-mail porque alguém adicionou seu endereço como canal de notificação. Caso não tenha solicitado isso, ignore e exclua este e-mail.',
  'confirmNotificationChannelEmail.subject' => '$projectName: Confirmar e-mail de notificação',
  'confirmNotificationChannelEmail.body' =>
      'Hi,' . "\n\n"
    . 'alguém solicitou o envio de notificações de cron jobs do $projectName para $email.' . "\n\n"
    . 'Clique no link a seguir para confirmar este endereço de e-mail.' . "\n\n"
    . '{link|$confirmationLink|Confirmar endereço de e-mail}' . "\n\n"
    . 'Caso você não tenha solicitado isso, NÃO clique no link de confirmação; ignore e exclua este e-mail.' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'lostPasswordEmail.footer' => 'Você recebeu este email porque alguém tentou alterar a senha da sua conta. Caso não tenha solicitado isso, por favor, ignore e exclua este email.',
  'lostPasswordEmail.subject' => '$projectName: Alterar Senha',
  'lostPasswordEmail.body' =>
      'Olá,' . "\n\n"
    . 'você solicitou para alterar a senha da sua conta $projectName.' . "\n\n"
    . 'Por favor clique no link a seguir para alterar a sua senha.' . "\n\n"
    . '{link|$confirmationLink|Alterar Senha}' . "\n\n"
    . 'Caso não tenha solicitado esta mudança, por favor NÂO CLIQUE no link e do contrário ignore e exclua este email.' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'signupEmail.footer' => 'Você está recebendo este email porque alguém se inscreveu com o seu endereço de email. Caso não tenha solicitado isso, por favor ignore e exclua este email.',
  'signupEmail.subject' => '$projectName: Ativação da conta',
  'signupEmail.body' =>
      'Olá,' . "\n\n"
    . 'obrigado por se inscrever em $projectName!' . "\n\n"
    . 'Por favor clique no link a seguir para ativar a sua conta.' . "\n\n"
    . '{link|$confirmationLink|Ativar conta}' . "\n\n"
    . 'Caso não tenha se inscrito, por favor NÂO CLIQUE no link e do contrário ignore e exclua este email.' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'subscriptionEmail.footer' => 'Você está recebendo este email porque o status da sua assinatura foi alterado. Em caso de dúvida não hesite em entrar em contato com nossa equipe de suporte.',
  'subscriptionActivatedEmail.subject' => '$projectName: Assinatura ativada',
  'subscriptionActivatedEmail.body' =>
      'Olá,' . "\n\n"
    . 'muito obrigado por apoiar $projectName e tornar nosso serviço possível!' . "\n\n"
    . 'Sua assinatura foi ativada com sucesso. Em casos raros. o status da assinatura pode ainda não aparecer na sua conta. Neste caso, basta fazer login novamente.' . "\n\n"
    . 'A propósito: Você pode encontrar seus recibos e faturas em Configurações -> Gerenciar Assinatura.' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'subscriptionCancelledEmail.subject' => '$projectName: Assinatura encerrada',
  'subscriptionCancelledEmail.body' =>
      'Olá,' . "\n\n"
    . 'sua inscrição em $projectName foi encerrada agora.' . "\n\n"
    . 'Muito obrigado por apoiar $projectName!' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'subscriptionExpiringEmail.subject' => '$projectName: A assinatura está sendo encerrada',
  'subscriptionExpiringEmail.body' =>
      'Olá,' . "\n\n"
    . 'conforme solicitado estamos encerrando sua assinatura em $projectName a partir de $cancelAt.' . "\n\n"
    . 'Muito obrigado por apoiar $projectName!' . "\n\n"
    . 'Atenciosamente,' . "\n\n"
    . '$projectName',
  'dateFormat' => 'd/m/Y'
];
