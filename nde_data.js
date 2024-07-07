/*
  NOTE: In real life scenarios these have never been encountered: 
    REDIRECTOR, BOOLEAN, BINARY, GUID, FLOAT
*/
const FIELD_TYPES = {
    COLUMN: 0,
    INDEX: 1,
    REDIRECTOR: 2,
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    BINARY: 6,
    GUID: 7,
    FLOAT: 9,
    DATETIME: 10,
    LENGTH: 11,
    FILENAME: 12, // Assumption, used by filename
    LONG: 13 // Assumption, used by filesize, which uses 8 bytes
};


let RecordStruct = {
    $format: {
        id: 'byte',
        type: 'uint8',
        size: 'uint32',
        next: 'uint32',
        prev: 'uint32',
        data: {
            $switch: 'type',
            $cases: {
                [FIELD_TYPES.COLUMN]: {
                    $format: {
                        fieldType: 'byte',
                        unique: 'byte',
                        len: 'byte',
                        name: { $format: 'string', $length: 'len' }
                    }
                },                
                [FIELD_TYPES.INDEX]: {
                    $format: {
                        offset: 'uint32',
                        fieldType: 'uint32',
                        len: 'byte',
                        name: { $format: 'string', $length: 'len' }
                    }
                },
                [FIELD_TYPES.REDIRECTOR]:
                    { $format: 'uint32' },
                [FIELD_TYPES.STRING]: {
                    $format: {
                        len: 'uint16',
                        str: {
                            $format: 'string',
                            $encoding: 'utf16le',
                            $length: 'len'
                        }
                    }
                },
                [FIELD_TYPES.INTEGER]: { $format: 'int32' },
                [FIELD_TYPES.BOOLEAN]: { $format: 'byte' },
                [FIELD_TYPES.BINARY]: { $format: { len: 'uint16', data: { $format: 'buffer', $length: 'len' } } },
                [FIELD_TYPES.GUID]: { $format: 'buffer', $length: 16 },
                [FIELD_TYPES.FLOAT]: { $format: 'float' },
                [FIELD_TYPES.DATETIME]: { $format: 'int32' },
                [FIELD_TYPES.LENGTH]: { $format: 'int32' },
                [FIELD_TYPES.FILENAME]: {
                    $format: {
                        len: 'uint16',
                        str: {
                            $format: 'string',
                            $encoding: 'utf16le',
                            $length: 'len'
                        }
                    }
                },
                [FIELD_TYPES.LONG]: { $format: 'int64' },
                default: { $format: 'buffer', $length: 'size'}
            }
        }
    }
};

module.exports = {
    RecordStruct,
    FIELD_TYPES
}