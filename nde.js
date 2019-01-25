const fs = require("fs");
const StreamBuffer = require("streambuf");
const assert = require('assert');

const FIELD_TYPES = {
    UNDEFINED: 255,
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
    FILENAME: 12, // assumption, used by filename
    LONG: 13 // assumption, used by filesize, which uses 8 bytes
};

const NDE = {
    load: (pathDatFile, pathIdxFile) => {
        var nfi = new NdeFileIndex(pathIdxFile);
        var nfd = new NdeFileData(pathDatFile, nfi);
        return nfd;
    }
};

function NdeFileData(fname, Index) {
    var vm = this;
    var buffer;
    var columns;

    function init() {
        buffer = new StreamBuffer(fs.readFileSync(fname));
        var header = buffer.readString(8);
        assert.equal(header, "NDETABLE");
    }

    function convert(field) {
        var size;
        switch (field.type) {
            case FIELD_TYPES.COLUMN:
                field.data.skip(2);
                size = field.data.readByte();
                return field.data.readString(size);

            case FIELD_TYPES.INTEGER:
            case FIELD_TYPES.LENGTH:
                return field.data.readUInt32LE();
            case FIELD_TYPES.LONG:
                return field.data.readUInt32LE() + (field.data.readUInt32LE() * Math.pow(2, 32));

            case FIELD_TYPES.DATETIME:
                return new Date(field.data.readUInt32LE() * 1000);

            case FIELD_TYPES.STRING:
            case FIELD_TYPES.FILENAME:
                size = field.data.readUInt16LE() - 2;
                field.data.skip(2); // skip unicode bom
                return field.data.readString(size, "utf16le");

            case FIELD_TYPES.INDEX:
                field.data.skip(8);
                size = field.data.readByte();
                return field.data.readString($size);

            default:
                return '';
        }
    }

    vm.next = function () {
        var offset = Index.next();

        if (offset === null) {
            return null;
        }

        var field = {};
        var isCol;

        var value;
        var colName;

        var props = {};

        while (offset) {
            buffer.seek(offset);

            field.id = buffer.readByte();
            field.type = buffer.readByte();
            field.size = buffer.readUInt32LE();
            field.next = buffer.readUInt32LE();
            field.prev = buffer.readUInt32LE();
            field.data = buffer.read(field.size);

            isCol = field.type === FIELD_TYPES.COLUMN;

            if (field.type === FIELD_TYPES.INDEX) {
                return vm.next();
            }

            value = convert(field);

            if (columns) {
                if (columns[field.id]) {
                    colName = columns[field.id];
                    props[colName] = value;
                }
            } else {
                if (isCol) {
                    props[field.id] = value;
                }
            }

            offset = field.next;
        }

        if (isCol) {
            columns = props;
            return vm.next();
        }

        return props;
    };

    vm.reset = function () {
        columns = [];
        Index.reset();
    };

    init();
}

function NdeFileIndex(fname) {
    var vm = this;
    var count;
    var buffer;
    var cur;

    function init() {
        cur = 0;
        buffer = new StreamBuffer(fs.readFileSync(fname));

        var header = buffer.readString(8);
        assert.equal(header, "NDEINDEX");
        count = buffer.readUInt32LE();

        vm.reset();
    }

    vm.next = function () {
        cur++;
        if (buffer.isEOF() || (cur > count)) {
            return null;
        }

        var offset = buffer.readUInt32LE();
        var index = buffer.readUInt32LE();

        return offset;
    };

    vm.reset = function () {
        buffer.seek(16);
    };

    init(fname);
}

module.exports = NDE;