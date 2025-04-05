<?php
require_once('3rdparty/thrift/Thrift/ClassLoader/ThriftClassLoader.php');

use Thrift\ClassLoader\ThriftClassLoader;

$loader = new ThriftClassLoader();
$loader->registerNamespace('Thrift', 'lib/3rdparty/thrift');
$loader->registerDefinition('chronos', 'lib/protocol');
$loader->register();

use Thrift\Protocol\TBinaryProtocol;
use Thrift\Transport\TSocket;
use Thrift\Transport\THttpClient;
use Thrift\Transport\TBufferedTransport;
use Thrift\Exception\TException;

class ChronosClient {
  public $client;
  private $transport;

  function __construct($client, $transport) {
    $this->client = $client;
    $this->transport = $transport;
  }

  function __destruct() {
    try {
      $this->transport->close();
    } catch (Exception $ex) { }
  }

  public static function connectToNode($ip, $port) {
    $socket = new TSocket($ip, $port);
    $socket->setRecvTimeout(10000);
    $socket->setSendTimeout(250);
    $transport = new TBufferedTransport($socket, 1024, 1024);
    $protocol = new TBinaryProtocol($transport);
    $client = new \chronos\ChronosNodeClient($protocol);

    $transport->open();

    return new ChronosClient($client, $transport);
  }
}

class WAFValidatorClient {
  public $client;
  private $transport;

  function __construct($client, $transport) {
    $this->client = $client;
    $this->transport = $transport;
  }

  function __destruct() {
    try {
      $this->transport->close();
    } catch (Exception $ex) { }
  }

  public static function connect() {
    global $config;

    $socket = new TSocket($config['wafValidator']['host'], $config['wafValidator']['port']);
    $socket->setRecvTimeout(5000);
    $socket->setSendTimeout(250);
    $transport = new TBufferedTransport($socket, 1024, 1024);
    $protocol = new TBinaryProtocol($transport);
    $client = new \chronos\WAFValidatorClient($protocol);

    $transport->open();

    return new WAFValidatorClient($client, $transport);
  }
}
