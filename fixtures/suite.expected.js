module.exports = [
    {
        filename: 'abc.mp3',
        title: 'Song Title',
        artist: 'Artist Name',
        boolTest: true,
        intTest: 123,
        dateTimeTest: new Date('2000-01-01T00:00:00.000Z'),
        lengthTest: 1234567,
        longTest: 9223372036854776000,
        redirectorTest: 'Redirected string',
        binaryTest: [1, 2, 3, 4, 5],
        guidTest: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        floatTest: 3.140000104904175
    },
    {
        filename: 'def.mp3',
        title: 'UNKNOWN_TYPE: 255 - size: 4 - data: c\x00\x00\x00',
        artist: 'Singer person'
    }
]