# node-streambuf
> Streamed Buffers - .NET's BinaryReader facsimile

This library wraps most of [Buffer](https://nodejs.org/api/buffer.html)'s methods. 
The difference with Buffer is that you don't have to specify a position to read from for each read operation, it uses an internal position.

## Install

```
$ npm install streambuf
```


## Usage

```js
const fs = require('fs');
const StreamBuffer = require('streambuf');

let buffer = new StreamBuffer(fs.readFileSync('hiscore.dat'));

let nameLength = buffer.readUInt();
let name = buffer.readString(nameLength);

```