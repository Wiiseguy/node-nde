const test = require('aqa');
const NDE = require('./nde.js');

const testDatExpected = require('./fixtures/suite.expected.js')
const mainDatExpected = require('./fixtures/main.expected.js')

test('From file - test.dat', t => {
    t.disableLogging()
    const datFileName = 'fixtures/suite.dat';
    const indexFileName = 'fixtures/suite.idx';

    const reader = NDE.load(datFileName, indexFileName);
    const result = reader.readAll();
    t.deepEqual(result, testDatExpected);

    // Reset and read again
    reader.reset();
    const result2 = reader.readAll();
    t.deepEqual(result2, testDatExpected);
});

test('From buffer - test.dat', t => {
    t.disableLogging()
    const fs = require('fs');
    const datFileName = 'fixtures/suite.dat';
    const indexFileName = 'fixtures/suite.idx';

    const datBuffer = fs.readFileSync(datFileName);
    const indexBuffer = fs.readFileSync(indexFileName);

    const reader = NDE.load(datBuffer, indexBuffer);
    const result = reader.readAll();
    t.deepEqual(result, testDatExpected);
})


test('From file - no index', t => {
    t.disableLogging()
    const datFileName = 'fixtures/suite.dat';
    const data = NDE.load(datFileName);

    let e = t.throws(() => data.next());
    t.is(e.message, "next() without a valid 'start' requires an index file")

    const result = data.readAll();    

    t.deepEqual(result, [
        ...testDatExpected,
        // This is a side effect of not having the index file
        {
            redirectorTest: 'Redirected string',
            binaryTest: [1, 2, 3, 4, 5],
            guidTest: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            floatTest: 3.140000104904175
        }
    ]);
});

// main.dat and main.idx are from: https://github.com/neuralys/nde/tree/master/tests/Fixtures
test('From file - main.dat', t => {
    t.disableLogging()
    const datFileName = 'fixtures/main.dat';
    const indexFileName = 'fixtures/main.idx';

    const reader = NDE.load(datFileName, indexFileName);
    const result = reader.readAll();
    const expectedResult = mainDatExpected;
    t.deepEqual(result, expectedResult);
})