const fs = require('fs');
const { StreamBuffer } = require('streambuf');
const assert = require('assert');
const { readStruct } = require('node-structor');
const { RecordStruct, FIELD_TYPES } = require('./nde_data.js');

const AVAILABLE_FIELD_TYPES = Object.values(FIELD_TYPES);

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
     * @param { {type: number, data: any, id: number, size: number }} field
     * @returns
     */
    #convert(field) {
        if (AVAILABLE_FIELD_TYPES.indexOf(field.type) === -1) {
            console.warn(`Unknown field type detected: ${field.type}`, {
                id: field.id,
                size: field.size,
                data: field.data?.toString()
            });
            return `UNKNOWN_TYPE: ${field.type} - size: ${field.size} - data: ${field.data?.toString()}`;
        }
        switch (field.type) {
            case FIELD_TYPES.STRING:
            case FIELD_TYPES.FILENAME: {
                let str = field.data.str;
                if (str.charCodeAt(0) === 0xfeff) {
                    str = str.substring(1);
                }
                return str;
            }
            case FIELD_TYPES.BOOLEAN:
                return field.data === 1;
            case FIELD_TYPES.BINARY:
                return field.data.data;
            case FIELD_TYPES.GUID:
                return [...field.data];
            case FIELD_TYPES.DATETIME:
                return new Date(field.data * 1000);
            case FIELD_TYPES.LONG:
                return Number(field.data);
            default:
                return field.data;
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

        let opts = {
            offset,
            info: {
                pos: 0
            }
        };

        while (offset) {
            opts.offset = offset;

            const field = readStruct(RecordStruct, buffer, opts);
            buffer.seek(opts.info.pos); // Update the buffer position for index-less reads

            const value = this.#convert(field);

            // If a Redirector is read, jump to its given offset
            if (field.type === FIELD_TYPES.REDIRECTOR) {
                offset = field.data;
                continue;
            }

            if (this.#columns) {
                const colName = this.#columns[field.id] ?? field.id;
                record[colName] = value;
            } else {
                record[field.id] = field.data.name;
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
