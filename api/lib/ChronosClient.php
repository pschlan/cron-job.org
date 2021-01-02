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
    $transport = new TBufferedTransport($socket, 1024, 1024);
    $protocol = new TBinaryProtocol($transport);
    $client = new \chronos\ChronosNodeClient($protocol);

    $transport->open();

    return new ChronosClient($client, $transport);
  }
}
