const fs = require('fs');
const { StreamBuffer } = require('streambuf');
const assert = require('assert');

/*
  NOTE: In real life scenarios these have never been encountered: 
    UNDEFINED, REDIRECTOR, BOOLEAN, BINARY, GUID, FLOAT
*/
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
    FILENAME: 12, // Assumption, used by filename
    LONG: 13 // Assumption, used by filesize, which uses 8 bytes
};

function load(datFileOrBuffer, idxFileOrBuffer) {
    if (typeof datFileOrBuffer === 'string') {
        datFileOrBuffer = fs.readFileSync(datFileOrBuffer);
    }
    if (typeof idxFileOrBuffer === 'string') {
        idxFileOrBuffer = fs.readFileSync(idxFileOrBuffer);
    }

    let nfi = null;
    if (idxFileOrBuffer) {
        nfi = new NdeFileIndex(idxFileOrBuffer);
    }

    return new NdeFileData(datFileOrBuffer, nfi);
}

class NdeFileData {
    #buffer;
    #columns;
    #visitedOffsets;
    #Index;

    constructor(bufDat, Index) {
        this.#Index = Index;
        this.#buffer = StreamBuffer.from(bufDat);
        const header = this.#buffer.readString(8);
        assert.equal(header, 'NDETABLE');
        this.reset();
    }
    /**
     * Converts data from a record field based on its type
     * @param { {type: number, data: StreamBuffer, id: number, size: number }} field
     * @returns
     */
    #convert(field) {
        switch (field.type) {
            case FIELD_TYPES.COLUMN: {
                field.data.skip(2); // Skip column field type and index unique values
                const size = field.data.readByte();
                return field.data.readString(size);
            }
            case FIELD_TYPES.INDEX: {
                const offset = field.data.readUInt32LE();
                const type = field.data.readUInt32LE();
                const size = field.data.readByte();
                const name = field.data.readString(size);
                return { offset, type, name };
            }
            case FIELD_TYPES.REDIRECTOR:
                return field.data.readUInt32LE();
            case FIELD_TYPES.STRING:
            case FIELD_TYPES.FILENAME: {
                const size = field.data.readUInt16LE();
                const start = field.data.tell();
                let str = field.data.readString(size, 'utf16le');

                // Remove unicode BOM if present
                if (str.charCodeAt(0) === 0xfeff) {
                    str = str.substring(1);
                } else {
                    field.data.seek(start);
                    const normalStr = field.data.readString(size, 'utf8');
                    str = normalStr;
                }

                return str;
            }
            case FIELD_TYPES.INTEGER:
            case FIELD_TYPES.LENGTH:
                return field.data.readUInt32LE();
            case FIELD_TYPES.BOOLEAN:
                return field.data.readByte() === 1;
            case FIELD_TYPES.BINARY: {
                const size = field.data.readUInt16LE();
                return field.data.read(size).buffer;
            }
            case FIELD_TYPES.GUID:
                return [...field.data.read(16).buffer];
            case FIELD_TYPES.FLOAT:
                return field.data.readFloatLE();
            case FIELD_TYPES.DATETIME:
                return new Date(field.data.readUInt32LE() * 1000);
            case FIELD_TYPES.LONG:
                return field.data.readUInt32LE() + field.data.readUInt32LE() * Math.pow(2, 32);

            default:
                console.warn(`Unknown field type detected: ${field.type}`, {
                    id: field.id,
                    size: field.size,
                    data: field.data.buffer.toString()
                });
                return `UNKNOWN_TYPE: ${field.type} - size: ${field.size} - data: ${field.data.buffer.toString()}`;
        }
    }

    readAll() {
        const files = [];
        let entry;

        if (!this.#Index) {
            while ((entry = this.next(this.#buffer.getPos()))) {
                files.push(entry);
                if (this.#buffer.isEOF()) break;
            }
        } else {
            while ((entry = this.next())) {
                files.push(entry);
            }
        }

        return files;
    }

    #readColumns(columnsOffset) {
        this.#columns = this.next(columnsOffset);
    }
    #readIndexes(indexesOffset) {
        // These are not relevant and are not used
        this.next(indexesOffset);
    }

    next(start = -1) {
        if (start < 0 && this.#Index == null) throw new Error(`next() without a valid 'start' requires an index file`);
        const buffer = this.#buffer;
        const record = {};
        let offset = start >= 0 ? start : this.#Index.next();
        if (offset == null) {
            return null;
        }

        if (this.#Index == null) {
            if (this.#visitedOffsets.includes(offset)) {
                console.log(
                    'WARNING: Infinite loop prevented. No Index file provided, and the same offset is being visited again.'
                );
                return null;
            }
            this.#visitedOffsets.push(offset);
        }

        while (offset) {
            buffer.seek(offset);

            const field = {};
            field.id = buffer.readByte();
            field.type = buffer.readByte();
            field.size = buffer.readUInt32LE();
            field.next = buffer.readUInt32LE();
            field.prev = buffer.readUInt32LE();
            field.data = buffer.read(field.size);

            const value = this.#convert(field);

            // If a Redirector is read, jump to its given offset
            if (field.type === FIELD_TYPES.REDIRECTOR) {
                offset = value;
                continue;
            }

            if (this.#columns) {
                const colName = this.#columns[field.id] ?? field.id;
                record[colName] = value;
            } else {
                record[field.id] = value;
            }

            offset = field.next;
        }

        return record;
    }

    reset() {
        this.#columns = null;
        this.#visitedOffsets = [];
        this.#buffer.rewind();
        this.#Index?.reset();

        if (this.#Index == null) {
            this.#readColumns(8); // Start after header "NDETABLE"
            this.#readIndexes(this.#buffer.getPos());
        } else {
            this.#readColumns(this.#Index.next());
            this.#readIndexes(this.#Index.next());
        }
    }
}

class NdeFileIndex {
    #numRecords;
    #buffer;
    #currentRecord;

    constructor(bufIdx) {
        this.#buffer = new StreamBuffer(bufIdx);

        let header = this.#buffer.readString(8);
        assert.equal(header, 'NDEINDEX');
        this.#numRecords = this.#buffer.readUInt32LE();
        this.reset();
    }

    next() {
        this.#currentRecord++;
        if (this.#buffer.isEOF() || this.#currentRecord > this.#numRecords) {
            return null;
        }

        let offset = this.#buffer.readUInt32LE();
        this.#buffer.readUInt32LE();

        return offset;
    }

    reset() {
        this.#currentRecord = 0;
        this.#buffer.seek(16);
    }
}

module.exports = {
    load,

    NdeFileData,
    NdeFileIndex
};
