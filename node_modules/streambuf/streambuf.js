function StreamBuffer(buf) {
	if(!(this instanceof StreamBuffer)) {
		return new StreamBuffer(buf);
	}
	var pos = 0;
	this.buffer = buf;
	
	this.read = function(numBytes) {
		var res = buf.slice(pos, pos+numBytes);
		pos = pos + numBytes;
		return res;
	};
	this.readByte = this.readUInt8 = function() {
		var res = buf.readUInt8(pos);
		pos = pos + 1;
		return res;
	};
	
	//BE
	this.readUInt16BE = function() {
		var res = buf.readUInt16BE(pos);
		pos = pos + 2;
		return res;
	};
	this.readUInt32BE = function() {
		var res = buf.readUInt32BE(pos);
		pos = pos + 4;
		return res;
	};
	
	//LE
	this.readInt16LE = function() {
		var res = buf.readInt16LE(pos);
		pos = pos + 2;
		return res;
	};
	this.readUInt16LE = function() {
		var res = buf.readUInt16LE(pos);
		pos = pos + 2;
		return res;
	};
	this.readUInt32LE = this.readUInt = function() {
		var res = buf.readUInt32LE(pos);
		pos = pos + 4;
		return res;
	};
	var _readString = function(length, encoding) {
		if(length == undefined) {			
			for(length = 0;;length++) {
				if(pos+length >= buf.length || buf[pos + length] === 0) break;
			}
		}
		return buf.toString(encoding || "utf8", pos, pos+length);
	};
	this.readString = function(length, encoding) {
		var res = _readString(length, encoding);	
		pos = pos + (length == undefined ? res.length+1 : length);
		return res;
	};
	this.peekString = function(length, encoding) {
		var res = _readString(length, encoding);
		return res;
	};
	this.skip = function(length) {
		pos = pos + length;
	};
	this.setPos = this.seek = function(position) {
		pos = position;
	};
	this.getPos = this.tell = function() { return pos; };
	this.isEOF = function() { return pos >= buf.length; };
}

module.exports = StreamBuffer;