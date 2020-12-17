import { Condition, OperatorBag } from '../src/operators';

test('test no context should return false', () => {
    const cond:Condition = {
        key: 'stage',
        operator: {
            name: 'equal',
            value: 'qa'
        }
    }
    const bag = new OperatorBag(Logger.getLogger());
    expect(bag.satisfies(cond, {}).isValid).toBeFalsy();
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
    //expect(operators[cond.operator.name]).toBeDefined();
    //expect(operators[cond.operator.name](cond.operator.value, context[cond.key])).toBeTruthy();
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

    const bag = new OperatorBag(Logger.getLogger());
    expect(bag.satisfies(cond, context).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 'notEqualValue01' }).isValid).toBeFalsy();
})

test('test equal number', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'equal',
            value: 2
        }
    }
    const bag = new OperatorBag(Logger.getLogger());
    expect(bag.satisfies(cond, { 'key01': 2 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 3 }).isValid).toBeFalsy();
})

test('test greater-than', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'greater-than',
            value: 2
        }
    }
    const bag = new OperatorBag(Logger.getLogger());
    expect(bag.satisfies(cond, { 'key01': 3 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 2 }).isValid).toBeFalsy();
    expect(bag.satisfies(cond, { 'key01': '2' }).isValid).toBeFalsy();
    expect( () => bag.satisfies(cond, { 'key01': 'non_number' })).toThrow();
})

test('test greater-than-equal', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'greater-than-equal',
            value: 2
        }
    }
    const bag = new OperatorBag(Logger.getLogger());
    expect(bag.satisfies(cond, { 'key01': 3 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 2 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 1 }).isValid).toBeFalsy();
})

test('test less-than', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'less-than',
            value: 2
        }
    }
    const bag = new OperatorBag(Logger.getLogger());

    expect(bag.satisfies(cond, { 'key01': -1 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 1 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 2 }).isValid).toBeFalsy();
    expect(bag.satisfies(cond, { 'key01': 4 }).isValid).toBeFalsy();
})

test('test less-than-equal', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'less-than-equal',
            value: 2
        }
    }
    const bag = new OperatorBag(Logger.getLogger());

    expect(bag.satisfies(cond, { 'key01': -1 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 1 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 2 }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 4 }).isValid).toBeFalsy();
})

test('test in-set', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'in-set',
            value: [ 'foo', 'bar' ]
        }
    }
    const bag = new OperatorBag(Logger.getLogger());

    expect(bag.satisfies(cond, { 'key01': 'foo' }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 'bar' }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 'otherValue' }).isValid).toBeFalsy();
})

test('test not-in-set', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'not-in-set',
            value: [ 'foo', 'bar' ]
        }
    }
    const bag = new OperatorBag(Logger.getLogger());

    expect(bag.satisfies(cond, { 'key01': 'valueShouldBeThere' }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 'foo' }).isValid).toBeFalsy();
})

test('test matches regex', () => {
    const cond:Condition = {
        key: 'key01',
        operator: {
            name: 'matches-regex',
            value: '.+@some-corp\.com'
        }
    }

    const bag = new OperatorBag(Logger.getLogger());

    expect(bag.satisfies(cond, { 'key01': 'user1@some-corp.com' }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 'user2@some-corp.com' }).isValid).toBeTruthy();
    expect(bag.satisfies(cond, { 'key01': 'user1@other-corp.com' }).isValid).toBeFalsy();
})

test('test operator not exits should return false', ()=> {

    const cond:Condition = {
        key: "key01",
        operator: {
            name: "fuzzy",
            value: "@acme.com"
        }
    }

    const context = { 
        "key01" : "brandon.taylor@acme.com"
    }

    const bag = new OperatorBag(Logger.getLogger());

    expect(bag.satisfies(cond, context).isValid).toBeFalsy();
});

test("test percentual rollout no uuid given", () => {

    const cond:Condition = {
        key: "percentual-rollout",
        name: "rollout-condition",
        allocations: [{
            name: "fuzzy",
            value: "@acme.com",
            ratio: 0.2
        }]
    }

    const ctx = {}; // we give no uuid

    expect( () => { new OperatorBag(Logger.getLogger()).satisfies(cond, ctx) }).toThrowError('Rollout condition/option is set but no uuid is given!');
});


import { Logger } from '../src/util/Logger';


test('test percentual rollout', () =>{

    const cond:Condition = {
        key: "percentual-rollout",
        name: "rollout-condition",
        allocations: [{
            name: "bucketA",
            value: null,
            ratio: 0.5
        }]
    }

    const logger = Logger.createLogger("debug");
    const bag = new OperatorBag(logger);

    expect(bag.satisfies(cond, {uuid: 1}, 'feature').isValid).toBeFalsy();

    expect(bag.satisfies(cond, {uuid: 2}, 'feature').isValid).toBeTruthy();
});

test('test a/b split with allocation value', () => {

    const cond: Condition = {
        key: "percentual-rollout",
        name: "rollout-condition",
        allocations: [
            {
                name: "bucketA",
                value: 1,
                ratio: 0.5
            }, {
                name: "bucketB",
                value: 2,
                ratio: 0.5
            },
        ]
    }

    const logger = Logger.createLogger("debug");

    const bag = new OperatorBag(logger);

    const result1 = bag.satisfies(cond, {uuid: 1}, 'feature');
    
    expect(result1.isValid).toBeTruthy();
    expect(result1.rolloutValue).toBe(2);

    const result2 = bag.satisfies(cond, {uuid: 2}, 'feature');
    expect(result2.isValid).toBeTruthy();
    expect(result2.rolloutValue).toBe(1);
});