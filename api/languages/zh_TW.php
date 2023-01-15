<?php
$lang = [
  'changeEmail.footer' => '你收到這封郵件是因為有人試圖將一個帳戶連接到你的電子郵件地址。如果您沒有要求這樣做，請忽略並刪除這封電子郵件。',
  'changeEmail.subject' => '$projectName: 確認更改的電子郵件地址',
  'changeEmail.body' =>
      '嗨，' . "\n\n"
    . '您已請求將您的 $projectName 帳戶的電子郵件地址更改為 $newEmail。' . "\n\n"
    . '請點擊以下連結以確認您電子郵件地址的更改。' . "\n\n"
    . '{link|$confirmationLink|確認電郵地址}' . "\n\n"
    . '如果您沒有請求此更改，「不要」點擊確認連結，請忽略並刪除這封電子郵件。' . "\n\n"
    . '感謝您，' . "\n\n"
    . '$projectName',
  'lostPasswordEmail.footer' => '您收到此電子郵件是因為有人試圖重設您帳戶的密碼，如果您沒有提出要求，請忽略並刪除這封電子郵件。',
  'lostPasswordEmail.subject' => '$projectName: 重設密碼',
  'lostPasswordEmail.body' =>
      '嗨，' . "\n\n"
    . '您已請求重設您 $projectName 帳戶的密碼。' . "\n\n"
    . '請點擊以下連結重設您的密碼。' . "\n\n"
    . '{link|$confirmationLink|重設密碼}' . "\n\n"
    . '如果您沒有請求此更改，「不要」點擊該連結，請忽略並刪除這封電子郵件。' . "\n\n"
    . '感謝您，' . "\n\n"
    . '$projectName',
  'signupEmail.footer' => '您收到此電子郵件是因為有人使用您的電子郵件地址進行了註冊，如果您沒有提出要求，請忽略並刪除這封電子郵件。',
  'signupEmail.subject' => '$projectName: 啟動帳戶',
  'signupEmail.body' =>
      '嗨，' . "\n\n"
    . '感謝您在 $projectName 註冊！' . "\n\n"
    . '請點擊以下連結啟動您的帳戶。' . "\n\n"
    . '{link|$confirmationLink|啟動帳戶}' . "\n\n"
    . '如果您沒有註冊，「不要」點擊該連結，請忽略並刪除這封電子郵件。' . "\n\n"
    . '感謝您，' . "\n\n"
    . '$projectName',
  'subscriptionEmail.footer' => '您收到這封電子郵件是因為您的訂閱狀態發生了變化，如有疑問，請隨時與我們的支援團隊聯繫。',
  'subscriptionActivatedEmail.subject' => '$projectName: 訂閱已啟動',
  'subscriptionActivatedEmail.body' =>
      '嗨，' . "\n\n"
    . '非常感謝您支持 $projectName 並使我們的服務成為可能！' . "\n\n"
    . '您的訂閱已成功啟動，在極少數情況下，訂閱狀態可能尚未顯示在您的帳戶中，在這種情況下，請重新登入。' . "\n\n"
    . '順道一提：您可以在您的帳戶中的「設定」->「管理訂閱」中找到您的收據和發票。' . "\n\n"
    . '感謝您，' . "\n\n"
    . '$projectName',
  'subscriptionCancelledEmail.subject' => '$projectName: 訂閱已終止',
  'subscriptionCancelledEmail.body' =>
      '嗨，' . "\n\n"
    . '您在 $projectName 的訂閱現已終止。' . "\n\n"
    . '非常感謝您支持 $projectName！' . "\n\n"
    . '感謝您，' . "\n\n"
    . '$projectName',
  'subscriptionExpiringEmail.subject' => '$projectName: 訂閱正在終止',
  'subscriptionExpiringEmail.body' =>
      '嗨，' . "\n\n"
    . '根據要求，我們將終止您在 $projectName 的訂閱，從 $cancelAt 開始生效。' . "\n\n"
    . '非常感謝您支持 $projectName！' . "\n\n"
    . '感謝您，' . "\n\n"
    . '$projectName',
  'dateFormat' => 'Y/m/d'
];
