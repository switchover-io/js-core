import { Logger } from "../util/Logger";
import { md5 } from '../util/Hash';
export interface Operator {
    name: string;
    value: any;
}

export interface Condition {
    key: string;
    name?: string;
    operator?: Operator;
    allocations?: Array<Allocation>;
}

export interface Allocation {
    name?: string;
    ratio: number;
    value?: any;
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


const multivariation = (logger: Logger, allocations, uuid: string, salt: string) => {

    const buckets = 10000;

    const getVariation = (bucket, allocations) => {
        logger.debug(`Get variation for ${bucket}`);
        for(let allocation of allocations) {
            if (bucket < allocation.rangeEnd) {
                return bucket;
            }
        }
        return null;
    }


    const hashRatio = (identifer: string, salt: string) => {
        const hashCand = identifer + '-' + salt;
        const strHash = md5(hashCand).substring(0, 6);
        const intVal = parseInt(strHash, 16);
        const split = intVal / 0xFFFFFF;

        logger.debug(`Calculated split for ${identifer}: ${split}`);

        return split;
    }

    const transformAllocations = (allocations) => {
        const newAllocations = [];
        let sum:number = 0;
        for( let allocation of allocations){
            const last = allocation.ratio * buckets;
            sum += last;
            newAllocations.push( {
                name: allocation.name,
                value: allocation.value,
                rangeEnd: sum | 0 // "cast" to int
            })
        }
        return newAllocations;
    }

    const bucket = (hashRatio(uuid, salt) * buckets) | 0;
    const absoluteAllocations = transformAllocations(allocations);

    const variation = getVariation(bucket, absoluteAllocations);

    if (variation) {
        const allocationValue = variation.value ? variation.value : null;
        return true;
    }
    return false;
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
    "multivariation" : multivariation
}

function isRolloutCondition(cond: Condition) : boolean {
    return cond.allocations && cond.name === 'rollout-condition';
}


export function satisfies(cond: Condition, context, toggleName: string = '', logger?: Logger) : boolean {
    
    const ctxValue = context[cond.key];

    if (isRolloutCondition(cond)) {
        const uuid = context['uuid'];
        if (!uuid) {
            throw new Error('Rollout condition/option is set but no uuid is given!');
        }
        const rolloutOp = operators['multivariation'];

        return rolloutOp(logger, cond.allocations, uuid, toggleName);
    }
    
    if (!ctxValue) {
        return false;
    }

    if (!operators.hasOwnProperty(cond.operator.name)) {
        return false;
    }
    const fn = operators[cond.operator.name];
    return fn(cond.operator.value, ctxValue);
}