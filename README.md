# node-nde
> Winamp Media Library / Nullsoft Database Engine (NDE) reader

Use this library to read Winamp's Media Library database. Extract ratings, etc.

## Install

```
$ npm i node-nde
```


## Usage

```js
const path = require('path');
const NDE = require('node-nde');

const ndeReader = NDE.load('main.dat', 'main.idx');

let library = ndeReader.readAll();
```

> Note: main.dat and main.idx can be found in Winamp's Plugins\ml folder.

Example of the result of `readAll()`:

```js
[
  {
    filename: 'C:\\music\\song.mp3',
    title: 'Title',
    artist: 'Artist',
    year: 1986,
    genre: 'Genre',
    comment: '',
    length: 180, // length in sec
    type: 0,
    lastupd: '2016-01-04T21:47:39.000Z',
    lastplay: '2016-01-14T21:34:09.000Z',
    rating: 3,
    playcount: 32,
    filetime: '2010-11-21T14:37:32.000Z',
    filesize: 0,
    bitrate: 256,
    dateadded: '2016-01-04T21:47:39.000Z'
  },
  ...
]
```

An entry object may contain these properties:

```
filename title artist album year genre comment trackno length type lastupd lastplay rating tuid2 playcount filetime filesize bitrate disc albumartist replaygain_album_gain replaygain_track_gain publisher composer bpm discs tracks ispodcast podcastchannel podcastpubdate GracenoteFileID GracenoteExtData lossless category codec director producer width height mimetype dateadded
```

## What if I don't have an index (.idx) file?
`node-nde` can attempt to read the contents of the `.dat` file if no path to an index file is specified!

```js
const path = require('path');
const NDE = require('node-nde');

const ndeReader = NDE.load('main.dat');

let library = ndeReader.readAll();
```

Credits
-------

This library's initial version was based on [neuralys/nde](https://github.com/neuralys/nde) (PHP).
