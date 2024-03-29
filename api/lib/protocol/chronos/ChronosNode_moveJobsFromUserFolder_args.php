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

class ChronosNode_moveJobsFromUserFolder_args
{
    static public $isValidate = false;

    static public $_TSPEC = array(
        1 => array(
            'var' => 'userId',
            'isRequired' => false,
            'type' => TType::I64,
        ),
        2 => array(
            'var' => 'sourceFolderId',
            'isRequired' => false,
            'type' => TType::I64,
        ),
        3 => array(
            'var' => 'destFolderId',
            'isRequired' => false,
            'type' => TType::I64,
        ),
    );

    /**
     * @var int
     */
    public $userId = null;
    /**
     * @var int
     */
    public $sourceFolderId = null;
    /**
     * @var int
     */
    public $destFolderId = null;

    public function __construct($vals = null)
    {
        if (is_array($vals)) {
            if (isset($vals['userId'])) {
                $this->userId = $vals['userId'];
            }
            if (isset($vals['sourceFolderId'])) {
                $this->sourceFolderId = $vals['sourceFolderId'];
            }
            if (isset($vals['destFolderId'])) {
                $this->destFolderId = $vals['destFolderId'];
            }
        }
    }

    public function getName()
    {
        return 'ChronosNode_moveJobsFromUserFolder_args';
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
                    if ($ftype == TType::I64) {
                        $xfer += $input->readI64($this->userId);
                    } else {
                        $xfer += $input->skip($ftype);
                    }
                    break;
                case 2:
                    if ($ftype == TType::I64) {
                        $xfer += $input->readI64($this->sourceFolderId);
                    } else {
                        $xfer += $input->skip($ftype);
                    }
                    break;
                case 3:
                    if ($ftype == TType::I64) {
                        $xfer += $input->readI64($this->destFolderId);
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
        $xfer += $output->writeStructBegin('ChronosNode_moveJobsFromUserFolder_args');
        if ($this->userId !== null) {
            $xfer += $output->writeFieldBegin('userId', TType::I64, 1);
            $xfer += $output->writeI64($this->userId);
            $xfer += $output->writeFieldEnd();
        }
        if ($this->sourceFolderId !== null) {
            $xfer += $output->writeFieldBegin('sourceFolderId', TType::I64, 2);
            $xfer += $output->writeI64($this->sourceFolderId);
            $xfer += $output->writeFieldEnd();
        }
        if ($this->destFolderId !== null) {
            $xfer += $output->writeFieldBegin('destFolderId', TType::I64, 3);
            $xfer += $output->writeI64($this->destFolderId);
            $xfer += $output->writeFieldEnd();
        }
        $xfer += $output->writeFieldStop();
        $xfer += $output->writeStructEnd();
        return $xfer;
    }
}
