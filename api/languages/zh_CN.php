<?php
$lang = [
  'changeEmail.footer' => '您收到这封邮件是因为有人试图将一个帐户绑定到您的电子邮件地址。如果您没有要求这样做，请忽略并删除这封电子邮件。',
  'changeEmail.subject' => '$projectName: 确认更改的电子邮件地址',
  'changeEmail.body' =>
      '嗨，' . "\n\n"
    . '您已请求将您的 $projectName 帐户的电子邮件地址更改为 $newEmail。' . "\n\n"
    . '请点击以下链接以确认您电子邮件地址的更改。' . "\n\n"
    . '{link|$confirmationLink|确认电邮地址}' . "\n\n"
    . '如果您没有请求此更改，「不要」点击确认链接，请忽略并删除这封电子邮件。' . "\n\n"
    . '感谢您，' . "\n\n"
    . '$projectName',
  'lostPasswordEmail.footer' => '您收到此电子邮件是因为有人试图重设您帐户的密码，如果您没有提出要求，请忽略并删除这封电子邮件。',
  'lostPasswordEmail.subject' => '$projectName: 重设密码',
  'lostPasswordEmail.body' =>
      '嗨，' . "\n\n"
    . '您已请求重设您 $projectName 帐户的密码。' . "\n\n"
    . '请点击以下链接重设您的密码。' . "\n\n"
    . '{link|$confirmationLink|重设密码}' . "\n\n"
    . '如果您没有请求此更改，「不要」点击该链接，请忽略并删除这封电子邮件。' . "\n\n"
    . '感谢您，' . "\n\n"
    . '$projectName',
  'signupEmail.footer' => '您收到此电子邮件是因为有人使用您的电子邮件地址进行了注册，如果您没有提出要求，请忽略并删除这封电子邮件。',
  'signupEmail.subject' => '$projectName: 启动帐户',
  'signupEmail.body' =>
      '嗨，' . "\n\n"
    . '感谢您在 $projectName 注册！' . "\n\n"
    . '请点击以下链接启动您的帐户。' . "\n\n"
    . '{link|$confirmationLink|启动帐户}' . "\n\n"
    . '如果您没有注册，「不要」点击该链接，请忽略并删除这封电子邮件。' . "\n\n"
    . '感谢您，' . "\n\n"
    . '$projectName',
  'subscriptionEmail.footer' => '您收到这封电子邮件是因为您的订阅状态发生了变化，如有疑问，请随时与我们的支持团队联系。',
  'subscriptionActivatedEmail.subject' => '$projectName: 订阅已启动',
  'subscriptionActivatedEmail.body' =>
      '嗨，' . "\n\n"
    . '非常感谢您支持 $projectName 并使我们的服务成为可能！' . "\n\n"
    . '您的订阅已成功启动，在极少数情况下，订阅状态可能尚未显示在您的帐户中，在这种情况下，请重新登录。' . "\n\n"
    . '顺道一提：您可以在您的帐户中的「设置」->「管理订阅」中找到您的收据和发票。' . "\n\n"
    . '感谢您，' . "\n\n"
    . '$projectName',
  'subscriptionCancelledEmail.subject' => '$projectName: 订阅已终止',
  'subscriptionCancelledEmail.body' =>
      '嗨，' . "\n\n"
    . '您在 $projectName 的订阅现已终止。' . "\n\n"
    . '非常感谢您支持 $projectName！' . "\n\n"
    . '感谢您，' . "\n\n"
    . '$projectName',
  'subscriptionExpiringEmail.subject' => '$projectName: 订阅正在终止',
  'subscriptionExpiringEmail.body' =>
      '嗨，' . "\n\n"
    . '根据要求，我们将终止您在 $projectName 的订阅，从 $cancelAt 开始生效。' . "\n\n"
    . '非常感谢您支持 $projectName！' . "\n\n"
    . '感谢您，' . "\n\n"
    . '$projectName',
  'dateFormat' => 'Y/m/d'
];
