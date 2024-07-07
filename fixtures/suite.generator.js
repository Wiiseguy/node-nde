const { writeFileSync } = require('fs');
const Structor = require('node-structor');

const { RecordStruct, FIELD_TYPES } = require('../nde_data.js');

let dataStruct = {
    signature: 'char_8',
    columnRecord1: RecordStruct, // filename
    columnRecord2: RecordStruct, // title
    columnRecord3: RecordStruct, // artist
    columnRecord4: RecordStruct, // boolTest
    columnRecord5: RecordStruct, // intTest
    columnRecord6: RecordStruct, // dateTimeTest
    columnRecord7: RecordStruct, // lengthTest
    columnRecord8: RecordStruct, // longTest
    columnRecord9: RecordStruct, // redirectorTest
    columnRecord10: RecordStruct, // binaryTest
    columnRecord11: RecordStruct, // guidTest
    columnRecord12: RecordStruct, // floatTest
    indexRecord1: RecordStruct,
    indexRecord2: RecordStruct,
    firstRecord1: RecordStruct,
    firstRecord2: RecordStruct,
    firstRecord3: RecordStruct,
    firstRecord4: RecordStruct,
    firstRecord5: RecordStruct,
    firstRecord6: RecordStruct,
    firstRecord7: RecordStruct,
    firstRecord8: RecordStruct,
    firstRecord9: RecordStruct,
    firstRecord10: RecordStruct,
    firstRecord11: RecordStruct,
    firstRecord12: RecordStruct,
    secondRecord1: RecordStruct,
    secondRecord2: RecordStruct,
    secondRecord3: RecordStruct,

    redirectedRecord1: RecordStruct,
    redirectedRecord2: RecordStruct
};

const RECORD_SIZE_WITHOUT_DATA = 14;
let nextPos = 8;
function createRecord(id, type, size, data, final) {
    nextPos += size + RECORD_SIZE_WITHOUT_DATA;
    return {
        id,
        type,
        size: size,
        next: final ? 0 : nextPos,
        prev: 0,
        data
    };
}
function createColumnRecord(id, colName, final = false) {
    return createRecord(
        id,
        FIELD_TYPES.COLUMN,
        3 + colName.length,
        {
            fieldType: 0,
            unique: 0,
            len: colName.length,
            name: colName
        },
        final
    );
}
function createIndexRecord(id, offset, fieldType, indexName, final = false) {
    return createRecord(
        id,
        FIELD_TYPES.INDEX,
        9 + indexName.length,
        {
            offset,
            fieldType,
            len: indexName.length,
            name: indexName
        },
        final
    );
}
function createRedirectorRecord(id, offset, final = false) {
    return createRecord(id, FIELD_TYPES.REDIRECTOR, 4, offset, final);
}
function createStringRecord(id, str, final = false) {
    return createRecord(
        id,
        FIELD_TYPES.STRING,
        2 + str.length * 2,
        {
            len: str.length * 2,
            str
        },
        final
    );
}
function createIntRecord(id, int, final = false) {
    return createRecord(id, FIELD_TYPES.INTEGER, 4, int, final);
}
function createBoolRecord(id, bool, final = false) {
    return createRecord(id, FIELD_TYPES.BOOLEAN, 1, bool ? 1 : 0, final);
}
function createBinaryRecord(id, buffer, final = false) {
    return createRecord(
        id,
        FIELD_TYPES.BINARY,
        2 + buffer.length,
        {
            len: buffer.length,
            data: buffer
        },
        final
    );
}
function createGuidRecord(id, guid, final = false) {
    return createRecord(id, FIELD_TYPES.GUID, 16, guid, final);
}
function createFloatRecord(id, float, final = false) {
    return createRecord(id, FIELD_TYPES.FLOAT, 4, float, final);
}
function createDateTimeRecord(id, dateTime, final = false) {
    return createRecord(id, FIELD_TYPES.DATETIME, 4, dateTime, final);
}
function createLengthRecord(id, length, final = false) {
    return createRecord(id, FIELD_TYPES.LENGTH, 4, length, final);
}
function createLongRecord(id, long, final = false) {
    return createRecord(id, FIELD_TYPES.LONG, 8, long, final);
}
function createFileNameRecord(id, str, final = false) {
    return createRecord(
        id,
        FIELD_TYPES.FILENAME,
        2 + str.length * 2,
        {
            len: str.length * 2,
            str
        },
        final
    );
}

let dataObj = {
    signature: 'NDETABLE',
    columnRecord1: createColumnRecord(0, 'filename'),
    columnRecord2: createColumnRecord(1, 'title'),
    columnRecord3: createColumnRecord(2, 'artist'),
    columnRecord4: createColumnRecord(3, 'boolTest'),
    columnRecord5: createColumnRecord(4, 'intTest'),
    columnRecord6: createColumnRecord(5, 'dateTimeTest'),
    columnRecord7: createColumnRecord(6, 'lengthTest'),
    columnRecord8: createColumnRecord(7, 'longTest'),
    columnRecord9: createColumnRecord(8, 'redirectorTest'),
    columnRecord10: createColumnRecord(9, 'binaryTest'),
    columnRecord11: createColumnRecord(10, 'guidTest'),
    columnRecord12: createColumnRecord(11, 'floatTest', true),

    indexRecord1: createIndexRecord(0, 2 ** 32 - 1, 2 ** 32 - 1, 'None'),
    indexRecord2: createIndexRecord(1, 0, FIELD_TYPES.FILENAME, 'filename', true),

    firstRecord1: createFileNameRecord(0, '\ufeffabc.mp3'),
    firstRecord2: createStringRecord(1, '\ufeffSong Title'),
    firstRecord3: createStringRecord(2, '\ufeffArtist Name'),
    firstRecord4: createBoolRecord(3, true),
    firstRecord5: createIntRecord(4, 123),
    firstRecord6: createDateTimeRecord(5, 946684800), // 2000-01-01 00:00:00
    firstRecord7: createLengthRecord(6, 1234567),
    firstRecord8: createLongRecord(7, 2n ** 63n - 1n),
    firstRecord9: createRedirectorRecord(0, 757), // Should point to redirectedRecord1
    firstRecord10: createBinaryRecord(9, Buffer.from([1, 2, 3, 4, 5])),
    firstRecord11: createGuidRecord(10, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])),
    firstRecord12: createFloatRecord(11, 3.14, true),

    secondRecord1: createFileNameRecord(0, '\ufeffdef.mp3'),
    secondRecord2: createRecord(1, 255, 4, Buffer.from('c\x00\x00\x00')),
    secondRecord3: createStringRecord(2, '\ufeffSinger person', true),

    redirectedRecord1: createStringRecord(8, '\ufeffRedirected string'),
    redirectedRecord2: createRedirectorRecord(0, 594, true) // Should point to firstRecord10
};

let result = Buffer.alloc(1024);
let bytesWritten = Structor.writeStruct(dataObj, dataStruct, result);
// Remove trailing zeros
result = result.subarray(0, bytesWritten);

// Write data to test.dat
writeFileSync(__dirname + '/suite.dat', result);


let indexStruct = {
    signature: 'char_8',
    numRecords: 'uint32',
    unknown: 'uint32',
    primaryIndex: {
        $repeat: 'numRecords',
        $format: {
            offset: 'uint32',
            unknown: 'uint32'
        }
    }
};

let obj = {
    signature: 'NDEINDEX',
    numRecords: 4,
    unknown: 0,
    primaryIndex: [
        { offset: 8 },
        { offset: 317 },
        { offset: 375 },
        { offset: 663 }
    ]
};

let indexResult = Buffer.alloc(48);
Structor.writeStruct(obj, indexStruct, indexResult);

// Write index to test.idx
writeFileSync(__dirname + '/suite.idx', indexResult);
