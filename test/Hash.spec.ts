import {md5 } from '../src/util/Hash';

test('test md5', () => { 

    expect(md5('switchover')).toBe('9eaa87e8fc6111207ce11ca28efc6a81');
    expect(md5('some string')).toBe('5ac749fbeec93607fc28d666be85e73a');
})
