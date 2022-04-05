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

function load(pathDatFile, pathIdxFile) {
    if(pathIdxFile) {
        let nfi = new NdeFileIndex(pathIdxFile);
        return new NdeFileData(pathDatFile, nfi)
    }

    return new NdeFileData(pathDatFile);
}

function NdeFileData(fname, Index) {
    let self = this;
    let buffer;
    let columns;

    function init() {
        buffer = new StreamBuffer(fs.readFileSync(fname));
        let header = buffer.readString(8);
        assert.equal(header, "NDETABLE");
    }

    function convert(field) {
        let size;
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
                return field.data.readString(size);

            default:
                return '';
        }
    }

    self.readAll = function() {
        let files = [];
        let entry;

        // If we don't have an index, attempt to read .dat file anyway
        if(!Index) {
            // get columns
            let columns = self.next(8); // start after header "NDETABLE"        

            // Read garbage
            let garbage = self.next(buffer.getPos());
            
            while((entry = self.next(buffer.getPos()))) {
                files.push(entry); 
                if(buffer.isEOF()) break;
            }
        } else {
            while(entry = self.next()) {
                files.push(entry);
            }
        }

        return files;
    }

    self.next = function (start = -1) {
        if(start < 0 && !Index) throw new Error(`next() without a valid 'start' requires an index file`);
        let offset = start >= 0 ? start : Index.next();

        if (offset === null) {
            return null;
        }

        let field = {};
        let isCol;

        let value;
        let colName;

        let props = {};

        while (offset) {
            buffer.seek(offset);

            field.id = buffer.readByte();
            field.type = buffer.readByte();
            field.size = buffer.readUInt32LE();
            field.next = buffer.readUInt32LE();
            field.prev = buffer.readUInt32LE();
            field.data = buffer.read(field.size);

            isCol = field.type === FIELD_TYPES.COLUMN;

            if (field.type === FIELD_TYPES.INDEX && Index) {
                return self.next();
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
            if (Index) {
                return self.next();
            }
        }

        return props;
    };

    self.reset = function () {
        columns = [];
        Index.reset();
    };

    init();
}

function NdeFileIndex(fname) {
    let self = this;
    let count;
    let buffer;
    let cur;

    function init() {
        cur = 0;
        buffer = new StreamBuffer(fs.readFileSync(fname));

        let header = buffer.readString(8);
        assert.equal(header, "NDEINDEX");
        count = buffer.readUInt32LE();

        self.reset();
    }

    self.next = function () {
        cur++;
        if (buffer.isEOF() || (cur > count)) {
            return null;
        }

        let offset = buffer.readUInt32LE();
        let index = buffer.readUInt32LE();

        return offset;
    };

    self.reset = function () {
        buffer.seek(16);
    };

    init(fname);
}

module.exports = {
    load,

    NdeFileData,
    NdeFileIndex,
};