<?php
namespace chronos;

/**
 * Autogenerated by Thrift Compiler (0.18.0)
 *
 * DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
 *  @generated
 */
use Thrift\Base\TBase;
use Thrift\Type\TType;
use Thrift\Type\TMessageType;
use Thrift\Exception\TException;
use Thrift\Exception\TProtocolException;
use Thrift\Protocol\TProtocol;
use Thrift\Protocol\TBinaryProtocolAccelerated;
use Thrift\Exception\TApplicationException;

class JobAuthentication
{
    static public $isValidate = false;

    static public $_TSPEC = array(
        1 => array(
            'var' => 'enable',
            'isRequired' => false,
            'type' => TType::BOOL,
        ),
        2 => array(
            'var' => 'user',
            'isRequired' => false,
            'type' => TType::STRING,
        ),
        3 => array(
            'var' => 'password',
            'isRequired' => false,
            'type' => TType::STRING,
        ),
    );

    /**
     * @var bool
     */
    public $enable = null;
    /**
     * @var string
     */
    public $user = null;
    /**
     * @var string
     */
    public $password = null;

    public function __construct($vals = null)
    {
        if (is_array($vals)) {
            if (isset($vals['enable'])) {
                $this->enable = $vals['enable'];
            }
            if (isset($vals['user'])) {
                $this->user = $vals['user'];
            }
            if (isset($vals['password'])) {
                $this->password = $vals['password'];
            }
        }
    }

    public function getName()
    {
        return 'JobAuthentication';
    }


    public function read($input)
    {
        $xfer = 0;
        $fname = null;
        $ftype = 0;
        $fid = 0;
        $xfer += $input->readStructBegin($fname);
        while (true) {
            $xfer += $input->readFieldBegin($fname, $ftype, $fid);
            if ($ftype == TType::STOP) {
                break;
            }
            switch ($fid) {
                case 1:
                    if ($ftype == TType::BOOL) {
                        $xfer += $input->readBool($this->enable);
                    } else {
                        $xfer += $input->skip($ftype);
                    }
                    break;
                case 2:
                    if ($ftype == TType::STRING) {
                        $xfer += $input->readString($this->user);
                    } else {
                        $xfer += $input->skip($ftype);
                    }
                    break;
                case 3:
                    if ($ftype == TType::STRING) {
                        $xfer += $input->readString($this->password);
                    } else {
                        $xfer += $input->skip($ftype);
                    }
                    break;
                default:
                    $xfer += $input->skip($ftype);
                    break;
            }
            $xfer += $input->readFieldEnd();
        }
        $xfer += $input->readStructEnd();
        return $xfer;
    }

    public function write($output)
    {
        $xfer = 0;
        $xfer += $output->writeStructBegin('JobAuthentication');
        if ($this->enable !== null) {
            $xfer += $output->writeFieldBegin('enable', TType::BOOL, 1);
            $xfer += $output->writeBool($this->enable);
            $xfer += $output->writeFieldEnd();
        }
        if ($this->user !== null) {
            $xfer += $output->writeFieldBegin('user', TType::STRING, 2);
            $xfer += $output->writeString($this->user);
            $xfer += $output->writeFieldEnd();
        }
        if ($this->password !== null) {
            $xfer += $output->writeFieldBegin('password', TType::STRING, 3);
            $xfer += $output->writeString($this->password);
            $xfer += $output->writeFieldEnd();
        }
        $xfer += $output->writeFieldStop();
        $xfer += $output->writeStructEnd();
        return $xfer;
    }
}
