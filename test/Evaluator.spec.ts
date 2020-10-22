import { Evaluator } from "../src/Evaluator"

const config = [{
    name: "toggle-001",
    status: 1,
    value: true,
    strategy: 3,
    conditions: [{
        key: 'key01',
        operator: {
            name: 'equal',
            value: 'aValue002'
        },
    },
    {
        key: 'key02',
        operator: {
            name: 'equal',
            value: 'some_OtherValue'
        }
    }]
}];


test('test evaluation active without conditions', () => {
    const evaluator = new Evaluator();

    const context = {
        "otherKey01" : "aValue001"
    }

    const testConfig = [
        Object.assign(config[0], { conditions: []})
    ] 

    expect(evaluator.evaluate(testConfig, 'toggle-001', context, false))
        .toBeTruthy();
})

test('test evaluation always inactive', () => {
    const evaluator = new Evaluator();

    const context = {
        "otherKey01" : "aValue001"
    }

    const testConfig = [
        Object.assign(config[0], { status: 4})
    ] 

    expect(evaluator.evaluate(testConfig, 'toggle-001', context, true))
        .toBeTruthy();
        expect(evaluator.evaluate(testConfig, 'toggle-001', context, false))
        .toBeFalsy();
})

test('test evaluation strategy all conditions true', () => {
    const evaluator = new Evaluator();

    const context = {
        "key01" : "aValue002",
        "key02" : "some_OtherValue",
        "amountFoo" : 3,
    }

    const testConfig = [
        Object.assign(config[0], { status: 1, strategy: 3 }) // STRAGEGY_ALL
    ] 

    expect(evaluator.evaluate(testConfig, 'toggle-001', context, true)).toBeTruthy();
})

test('test evaluation strategy at least one conditions true', () => {
    const evaluator = new Evaluator();

    const context = {
        "key01" : "aValue002",
        "key02" : "a_VeryDifferentVlaue",
        "amountFoo" : 3,
    }

    const testConfig = [
        Object.assign(config[0], 
        {   status: 1, 
            strategy: 1, 
            conditions: [{
            key: 'key01',
            operator: {
                name: 'equal',
                value: 'aValue002'
            },
        },
        {
            key: 'key02',
            operator: {
                name: 'equal',
                value: 'some_OtherValue'
            }
        }]}) // STRATEGY_ATLEASTONE
    ] 

    expect(evaluator.evaluate(testConfig, 'toggle-001', context, false)).toBeTruthy();
    expect(evaluator.evaluate(testConfig, 'toggle-001', { "key01" : "no_condition_fullfilled"}, false)).toBeFalsy();
})

test('test evaluation strategy majority of conditions are true', () => {
    const evaluator = new Evaluator();

    const context = {
        "key01" : "aValue002",
        "key02" : "a_VeryDifferentVlaue",
        "amountFoo" : 4,
    }

    const majorityConfig = [{
        name: "toggle-001",
        value: true,
        status: 1,
        strategy: 2, //STRATEGY_MAJORITY (= >50%)
        conditions: [{
            key: 'key01',
            operator: {
                name: 'equal',
                value: 'aValue002'
            },
        },
        {
            key: 'key02',
            operator: {
                name: 'equal',
                value: 'some_OtherValue'
            }
        },
        {
            key: 'amountFoo',
            operator: {
                name: 'greater-than',
                value: 3
            }
        }]
    }];

    expect(evaluator.evaluate(majorityConfig, 'toggle-001', context, true)).toBeTruthy();
})