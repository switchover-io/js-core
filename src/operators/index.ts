export interface Operator {
    name: string;
    value: any;
}

export interface Condition {
    key: string;
    operator: Operator;
}

const equalsOp = (condVal, actual) => {
    return condVal === actual;
}

const greaterThanOp = (condVal, actual) => {
    const parsedCondVal = parseToNumber(condVal);
    const parsedActual = parseToNumber(actual);
    return parsedActual > parsedCondVal;
}

const greaterThanEqualOp = (condVal, actual) => {
    const parsedCondVal = parseToNumber(condVal);
    const parsedActual = parseToNumber(actual);
    return parsedActual >= parsedCondVal;
}

const inSetOp = (condVal, actual) => {
    return condVal.includes(actual);
}

const notInSetOp = (condVal, actual) => {
    return !condVal.includes(actual);
}

const lessThanOp = (condVal, actual) => {
    const parsedCondVal = parseToNumber(condVal);
    const parsedActual = parseToNumber(actual);
    return parsedActual < parsedCondVal;
}

const lessThanEqualOp = (condVal, actual) => {
    const parsedCondVal = parseToNumber(condVal);
    const parsedActual = parseToNumber(actual);
    return parsedActual <= parsedCondVal;
}

const matchesRegexOp = (condVal, actual) => {
    const regex = new RegExp(condVal);
    return regex.test(actual);
}

function parseToNumber(val) {
    if (typeof val === 'string') {
        const parsed = parseFloat(val);
        if (isNaN(parsed)) {
            throw new Error('Error parsing string value of condition value');
        }
        return parsed;
    }
    if (typeof val === 'number') {
        return val; 
    }
    throw new Error('Error parsing condition values')
}

export const operators = {
    "equal" : equalsOp,
    "greater-than" : greaterThanOp,
    "greater-than-equal" : greaterThanEqualOp,
    "in-set" : inSetOp,
    "not-in-set" : notInSetOp,
    "less-than" : lessThanOp,
    "less-than-equal" : lessThanEqualOp,
    //"percentage" : percentageOp,
    "matches-regex" : matchesRegexOp,
}


export function satisfies(cond: Condition, context) : boolean {
    if (!context[cond.key]) {
        return false;
    }
    const fn = operators[cond.operator.name];
    return fn(cond.operator.value, context[cond.key]);
}