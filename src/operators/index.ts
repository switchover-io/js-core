import { Logger } from "../util/Logger";
import { md5 } from '../util/Hash';
import { AssertionResult } from "./AssertionResult";
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


class Multivariation2 {
    private logger: Logger;
    private buckets = 10000;

    constructor(logger: Logger) {
        this.logger = logger;
    }


    private getVariation(bucket, allocations) {
        this.logger.debug(`Get variation for ${bucket}`);
        for(let allocation of allocations) {
            if (bucket < allocation.rangeEnd) {
                return allocation;
            }
        }
        return null;
    }


    hashRatio = (identifer: string, salt: string) => {
        const hashCand = identifer + '-' + salt;
        const strHash = md5(hashCand).substring(0, 6);
        const intVal = parseInt(strHash, 16);
        const split = intVal / 0xFFFFFF;

        this.logger.debug(`Calculated split for ${identifer}: ${split}`);

        return split;
    }

    transformAllocations = (allocations) => {
        const newAllocations = [];
        let sum:number = 0;
        for( let allocation of allocations){
            const last = allocation.ratio * this.buckets;
            sum += last;
            newAllocations.push( {
                name: allocation.name,
                value: allocation.value,
                rangeEnd: sum | 0 // "cast" to int
            })
        }
        return newAllocations;
    }
    validate(allocations: Array<Allocation>, uuid: string, salt: string): AssertionResult {
        const bucket = (this.hashRatio(uuid, salt) * this.buckets) | 0;
        const absoluteAllocations = this.transformAllocations(allocations);

        const variation = this.getVariation(bucket, absoluteAllocations);

        if (variation) {
            const allocationValue = variation.value ? variation.value : null;
            return new AssertionResult(true, allocationValue);
        }
        return new AssertionResult(false);
    }
}


function isRolloutCondition(cond: Condition) : boolean {
    return cond.allocations && cond.name === 'rollout-condition';
}

export class OperatorBag {

    private logger: Logger;
    private operators: any;

    constructor(logger: Logger) {
        this.logger = logger;

        this.operators = {
            "equal": equalsOp,
            "greater-than": greaterThanOp,
            "greater-than-equal": greaterThanEqualOp,
            "in-set": inSetOp,
            "not-in-set": notInSetOp,
            "less-than": lessThanOp,
            "less-than-equal": lessThanEqualOp,
            "matches-regex": matchesRegexOp,
            "multivariation": new Multivariation2(this.logger)
        }
    }

    satisfies(cond: Condition, context, toggleName?: string): AssertionResult {
        const ctxValue = context[cond.key];

        if (isRolloutCondition(cond)) {
            const uuid = context['uuid'];
            if (!uuid) {
                throw new Error('Rollout condition/option is set but no uuid is given!');
            }
            const rolloutOp = this.operators['multivariation'];

            return rolloutOp.validate(cond.allocations, uuid, toggleName);
        }

        if (!ctxValue) {
            return new AssertionResult(false);
        }

        if (!this.operators.hasOwnProperty(cond.operator.name)) {
            return new AssertionResult(false);
        }
        const fn = this.operators[cond.operator.name];
        return new AssertionResult(fn(cond.operator.value, ctxValue));
    }

}
