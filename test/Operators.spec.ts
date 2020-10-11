import { Condition, satisfies, operators } from '../src/operators';

test('test no context should return false', () => {
    const cond:Condition = {
        key: 'stage',
        operator: {
            name: 'equal',
            value: 'qa'
        }
    }

    expect(satisfies(cond, {})).toBeFalsy();
})

test('basic operators test', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'equal',
            value: 'aValue01'
        }
    }
    const context = { 'key01': 'aValue01', 'key02' : 'valueOfKey02' };
    expect(context[cond.key]).toEqual('aValue01');
    expect(operators[cond.operator.name]).toBeDefined();
    expect(operators[cond.operator.name](cond.operator.value, context[cond.key])).toBeTruthy();
});

test('test equal string', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'equal',
            value: 'aValue01'
        }
    }
    const context = { 'key01': 'aValue01', 'key02' : 'valueOfKey02' };
    expect(satisfies(cond, context)).toBeTruthy();
    expect(satisfies(cond, { 'key01': 'notEqualValue01' })).toBeFalsy();
})

test('test equal number', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'equal',
            value: 2
        }
    }
    expect(satisfies(cond, { 'key01': 2 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 3 })).toBeFalsy();
})

test('test greater-than', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'greater-than',
            value: 2
        }
    }
    expect(satisfies(cond, { 'key01': 3 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 2 })).toBeFalsy();
    expect(satisfies(cond, { 'key01': '2' })).toBeFalsy();
    expect( () => satisfies(cond, { 'key01': 'non_number' })).toThrow();
})

test('test greater-than-equal', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'greater-than-equal',
            value: 2
        }
    }
    expect(satisfies(cond, { 'key01': 3 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 2 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 1 })).toBeFalsy();
})

test('test less-than', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'less-than',
            value: 2
        }
    }
    expect(satisfies(cond, { 'key01': -1 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 1 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 2 })).toBeFalsy();
    expect(satisfies(cond, { 'key01': 4 })).toBeFalsy();
})

test('test less-than-equal', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'less-than-equal',
            value: 2
        }
    }
    expect(satisfies(cond, { 'key01': -1 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 1 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 2 })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 4 })).toBeFalsy();
})

test('test in-set', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'in-set',
            value: [ 'foo', 'bar' ]
        }
    }
    expect(satisfies(cond, { 'key01': 'foo' })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 'bar' })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 'otherValue' })).toBeFalsy();
})

test('test not-in-set', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'not-in-set',
            value: [ 'foo', 'bar' ]
        }
    }
    expect(satisfies(cond, { 'key01': 'valueShouldBeThere' })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 'foo' })).toBeFalsy();
})

test('test matches regex', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'matches-regex',
            value: '.+@some-corp\.com'
        }
    }
    expect(satisfies(cond, { 'key01': 'user1@some-corp.com' })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 'user2@some-corp.com' })).toBeTruthy();
    expect(satisfies(cond, { 'key01': 'user1@other-corp.com' })).toBeFalsy();
})