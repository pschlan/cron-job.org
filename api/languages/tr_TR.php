<?php
$lang = [
  'changeEmail.footer' => 'Bu e-postayı, birinin e-posta adresinizi bir hesaba bağlamaya çalıştığı için alıyorsunuz. Eğer bu işlemi siz talep etmediyseniz, lütfen bu e-postayı göz ardı edin ve silin.',
  'changeEmail.subject' => '$projectName: Değiştirilen e-posta adresini onaylayın',
  'changeEmail.body' =>
      'Merhaba,' . "\n\n"
    . '$projectName hesabınızın e-posta adresini $newEmail olarak değiştirmek için bir talepte bulundunuz.' . "\n\n"
    . 'E-posta adresinizdeki değişikliği onaylamak için lütfen aşağıdaki bağlantıya tıklayın.' . "\n\n"
    . '{link|$confirmationLink|E-posta adresini onayla}' . "\n\n"
    . 'Eğer bu değişikliği siz talep etmediyseniz, lütfen onay bağlantısına tıklamayın ve bu e-postayı göz ardı edin ve silin.' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'lostPasswordEmail.footer' => 'Bu e-postayı, birinin hesabınızın şifresini sıfırlamaya çalıştığı için alıyorsunuz. Eğer bu işlemi siz talep etmediyseniz, lütfen bu e-postayı göz ardı edin ve silin.',
  'lostPasswordEmail.subject' => '$projectName: Şifre sıfırlama',
  'lostPasswordEmail.body' =>
      'Merhaba,' . "\n\n"
    . '$projectName hesabınızın şifresini sıfırlamak için bir talepte bulundunuz.' . "\n\n"
    . 'Şifrenizi sıfırlamak için lütfen aşağıdaki bağlantıya tıklayın.' . "\n\n"
    . '{link|$confirmationLink|Şifreyi sıfırla}' . "\n\n"
    . 'Eğer bu işlemi siz talep etmediyseniz, lütfen bağlantıya tıklamayın ve bu e-postayı göz ardı edin ve silin.' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'signupEmail.footer' => 'Bu e-postayı, biri e-posta adresinizle kayıt olduğu için alıyorsunuz. Eğer bu işlemi siz gerçekleştirmediyseniz, lütfen bu e-postayı göz ardı edin ve silin.',
  'signupEmail.subject' => '$projectName: Hesabı aktifleştirin',
  'signupEmail.body' =>
      'Merhaba,' . "\n\n"
    . '$projectName hizmetine kayıt olduğunuz için teşekkür ederiz!' . "\n\n"
    . 'Hesabınızı aktifleştirmek için lütfen aşağıdaki bağlantıya tıklayın.' . "\n\n"
    . '{link|$confirmationLink|Hesabı aktifleştir}' . "\n\n"
    . 'Eğer bu kaydı siz yapmadıysanız, lütfen bağlantıya tıklamayın ve bu e-postayı göz ardı edin ve silin.' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'subscriptionEmail.footer' => 'Bu e-postayı, abonelik durumunuz değiştiği için alıyorsunuz. Eğer sorularınız varsa, destek ekibimizle iletişime geçmekten çekinmeyin.',

  'subscriptionActivatedEmail.subject' => '$projectName: Aboneliğiniz aktifleştirildi',
  'subscriptionActivatedEmail.body' =>
      'Merhaba,' . "\n\n"
    . '$projectName hizmetini desteklediğiniz ve mümkün kıldığınız için teşekkür ederiz!' . "\n\n"
    . 'Aboneliğiniz başarıyla aktifleştirildi. Nadir durumlarda, abonelik durumunuz hesabınızda hemen görünmeyebilir. Böyle bir durumda, lütfen tekrar giriş yapın.' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'subscriptionCancelledEmail.subject' => '$projectName: Abonelik iptal edildi',
  'subscriptionCancelledEmail.body' =>
      'Merhaba,' . "\n\n"
    . '$projectName aboneliğiniz şu anda iptal edildi.' . "\n\n"
    . '$projectName hizmetini desteklediğiniz için teşekkür ederiz!' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'subscriptionExpiringEmail.subject' => '$projectName: Aboneliğiniz sona eriyor',
  'subscriptionExpiringEmail.body' =>
      'Merhaba,' . "\n\n"
    . 'Talebiniz doğrultusunda, $projectName aboneliğiniz $cancelAt tarihinde sona erecektir.' . "\n\n"
    . '$projectName hizmetini desteklediğiniz için teşekkür ederiz!' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'paymentFailedEmail.subject' => '$projectName: Abonelik ödemesi başarısız oldu',
  'paymentFailedEmail.body' =>
      'Merhaba,' . "\n\n"
    . '$projectName aboneliğiniz için ödeme sağlayıcımız bir başarısız ödeme bildirdi.' . "\n\n"
    . 'Aboneliğinizin yenilenmesini sağlamak için lütfen ödeme yönteminizi güncelleyin. Ödeme bilgilerinizi güncellemek için aşağıdaki bağlantıyı ziyaret edebilirsiniz:' . "\n\n"
    . 'https://console.cron-job.org/' . "\n\n"
    . 'Eğer herhangi bir sorunuz veya endişeniz varsa, bizimle iletişime geçmekten çekinmeyin.' . "\n\n"
    . 'Saygılarımızla,' . "\n\n"
    . '$projectName',

  'dateFormat' => 'Y/m/d'
];