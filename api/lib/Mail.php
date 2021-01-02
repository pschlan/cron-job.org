<?php
class Mail {
  private $plainText;
  private $htmlText;
  private $recipient;
  private $sender;
  private $subject;
  private $boundary;
  private $vars = [];

  function __construct() {
    $this->boundary = '--==_boundary_' . md5(uniqid('mimeBoundary'));
  }

  public function setPlainText($plainText) {
    $this->plainText = $plainText;
  }

  public function setHtmlText($htmlText) {
    $this->htmlText = $htmlText;
  }

  public function setRecipient($recipient) {
    $this->recipient = $recipient;
  }

  public function setSender($sender) {
    $this->sender = $sender;
  }

  public function setSubject($subject) {
    $this->subject = $subject;
    $this->vars['subject'] = $subject;
  }

  public function assign($key, $value) {
    $this->vars[$key] = $value;
  }

  public function send() {
    $body = $this->encodePart('text/plain', $this->prepareText($this->plainText, false))
      . $this->encodePart('text/html', $this->prepareText($this->htmlText, true))
      . '--' . $this->boundary . '--' . "\r\n";
    return mail(
      $this->getPrincipalAddress($this->recipient),
      $this->encodeHeader($this->prepareText($this->subject, false)),
      $body,
      $this->headers()
    );
  }

  private function prepareText($text, $isHtml) {
    $text = preg_replace_callback('/\\$(\\.?[a-zA-Z0-9]+)/', function($matches) use($isHtml) {
      $key = $matches[1];
      
      $expand = false;
      if ($key[0] === '.') {
        $key = substr($key, 1);
        $expand = true;
      }

      if (isset($this->vars[$key])) {
        $value = $this->vars[$key];
        if ($isHtml) {
          $value = nl2br(htmlentities($value, ENT_COMPAT | ENT_HTML401, 'UTF-8'));
        }
        if ($expand) {
          $value = $this->prepareText($value, $isHtml);
        }
        return $value;
      }

      return 'UNKNOWN_VARIABLE:' . $key;
    }, $text);
    $text = preg_replace_callback('/\\{([a-zA-Z]+)\\|([^\\|]+)\\|([^\\}]+)\\}/', function($matches) use($isHtml) {
      if ($matches[1] === 'link') {
        if ($isHtml) {
          return '<a href="' . $matches[2] . '" target="_blank">' . $matches[3] . '</a>';
        } else {
          return $matches[2];
        }
      }
    }, $text);
    return $text;
  }

  private function encodePart($contentType, $data) {
    return (
      '--' . $this->boundary . "\r\n" .
      'Content-Type: ' . $contentType . '; charset=UTF-8' . "\r\n" .
      'Content-Transfer-Encoding: quoted-printable' . "\r\n" .
      "\r\n" .
      quoted_printable_encode($data) .
      "\r\n"
    );
  }

  private function headers() {
    return [
      'From'            => $this->encodePrincipalHeader($this->sender),
      'Mime-Version'    => '1.0',
      'Content-Type'    => 'multipart/alternative; boundary="' . $this->boundary . '"; charset=UTF-8'
    ];
  }

  private function encodePrincipalHeader($value) {
    if (is_array($value)) {
      return '"' . $this->encodeHeader($value[0]) . '" <' . $value[1] . '>';
    }
    return $value;
  }

  private function getPrincipalAddress($value) {
    if (is_array($value)) {
      return $value[1];
    }
    return $value;
  }

  private function encodeHeader($value) {
    $value = str_replace(["\n", "\r"], '', $value);
    if ($this->shouldEncodeHeader($value)) {
      return '=?utf-8?Q?' . quoted_printable_encode($value) . '?=';
    }
    return $value;
  }

  private function shouldEncodeHeader($value) {
    for ($i = 0; $i < strlen($value); ++$i) {
      if (ord($value[$i]) >= 0x7F) {
        return true;
      }
    }
    return false;
  }
}
