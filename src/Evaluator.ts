import { Logger } from "./util/Logger";
import { Condition, OperatorBag } from "./operators";


const ACTIVE = 1;
//const CONDITIONALLY_ACTIVE = 1;
const INACTIVE = 4;

const STRATEGY_ATLEASTONE = 1;
const STRATEGY_MAJORITY = 2;
const STRATEGY_ALL = 3;

export interface EvaluationResult {
    value: any;
    variationId?: any;
}


export class Evaluator {

    private logger: Logger = Logger.getLogger();
    private operatorBag: OperatorBag;

    constructor(logger?:Logger) {
        this.logger = logger || Logger.getLogger();
        this.operatorBag = new OperatorBag(this.logger);
    }

    public evaluate(config: any, name: string, context: any, defaultValue: any,  defaultVariationId?: any) : EvaluationResult {
        this.logger.debug('Evalutate config for toggle ' + name);

        if (!config) {
            this.logger.error("Toggle config is empty! Did you wait for init? All toggles will return default value");
        }

        let toggle = this.findByName(config, name);
        if (toggle) {

            const status = parseInt(toggle.status);

            this.logger.debug('Evaluate toggle with status: ' + status)

            //check conditions on given context
            switch (status) {
                case ACTIVE:
                    return this.evaluateOnActive(toggle, context, defaultValue, defaultVariationId); 
                case INACTIVE:
                    return { value: defaultValue, variationId: defaultVariationId };
            }

        }
        this.logger.error('Toggle with name ' + name + ' not found! Return default value');

        return { value: defaultValue, variationId: defaultVariationId };
    }

    private evaluateOnActive(toggle, context, defaultValue: any, defaultVariationId?: any) : EvaluationResult {
        if (this.hasConditions(toggle)) {
            return this.evaluateWithConditions(toggle, context, defaultValue, defaultVariationId);
        }
        return { value: toggle.value, variationId: defaultVariationId };
    }

    private hasConditions(toggle) {
        return toggle.conditions &&  toggle.conditions.length > 0;
    }

    private evaluateWithConditions(toggle, context, defaultValue, defaultVariationId?: any) : EvaluationResult {
        this.logger.debug('Evaluate toggle with conditions');
    
        if (!context && this.hasConditions(toggle) ) {
            return { value: defaultValue, variationId: defaultVariationId }
        }
    
        const strategy = parseInt(toggle.strategy);
    
        this.logger.debug('Evaluate toggle with strategy: ' + strategy);
    
        //TODO Check according evaluation strategy
        switch(strategy) {
            case STRATEGY_ALL:
                return this.evaluateAll(toggle, context, defaultValue, defaultVariationId); // ? toggle.value : defaultValue;
            case STRATEGY_ATLEASTONE:
                return this.evaluateAtLeastOne(toggle, context, defaultValue, defaultVariationId); //? toggle.value : defaultValue;
            /*case STRATEGY_MAJORITY:
                return this.evaluateMajority(toggle, context, defaultValue, defaultVariationId); //? toggle.value : defaultValue; */
        }
    
        throw new Error('No toggle.strategy given!');
    }
    
    private evaluateAll(toggle, context, defaultValue, defaultVariationId?: any) : EvaluationResult {
        this.logger.debug('All toggle conditions have to be satisfied');

        let rolloutValue = null;
        let variationId = null;
        for(const cond of toggle.conditions) {
            const assertResult = this.operatorBag.satisfies(cond, context, toggle.name);
            if (assertResult.rolloutValue) {
                rolloutValue = assertResult.rolloutValue;
            }
            if (assertResult.variationId) {
                variationId = assertResult.variationId;
            }
            if (!assertResult.isValid) {
                this.logger.debug('Cond ' + cond.key + ' was not satisfied');       
                this.logger.debug(cond);
                return {
                    value: defaultValue,
                    variationId: defaultVariationId
                }
            }
        }
        this.logger.debug('All conditions satisfied');

        return {
            value: rolloutValue || toggle.value,
            variationId: variationId || defaultVariationId
        }
    }
    
    private evaluateAtLeastOne(toggle, context, defaultValue, defaultVariationId?: any) {
        this.logger.debug('At least one condition has to be satisfied');
        for(const cond of toggle.conditions) {
            const assertResult = this.operatorBag.satisfies(cond, context, toggle.name)
            if (assertResult.isValid) {
                this.logger.debug('Condition ' + cond.key + ' was satisfied by given context');
                return {
                    value: assertResult.rolloutValue || toggle.value,
                    variationId: assertResult.variationId || defaultVariationId
                }
            }
        }
        this.logger.debug('No condition satisfied');
        return {
            value: defaultValue,
            variationId: defaultVariationId
        }
    }



/*
    private evaluateMajority(toggle, context, defaultValue) : EvaluationResult {
        this.logger.debug('Majority of conditions has to be satisfied');

        let hit = 0;    
        let miss = 0;

        let rolloutValue = null;
        for(const cond of toggle.conditions) {
            const assertResult = this.operatorBag.satisfies(cond, context, toggle.name);
            if (assertResult.isValid) {
                if (assertResult.rolloutValue) {
                    rolloutValue = assertResult.rolloutValue;
                }
                this.logger.debug('Condition ' + cond.key + ' was satisfied by given context');
                hit++
            } else {
                miss++
            }
        }
        if (hit > miss) {
            return rolloutValue || toggle.value;
        }
        return defaultValue;
    } */
    
    
    private findByName(config, name) {
        for(let i in config) {
            if (config[i] && config[i].name === name) {
                return config[i];
            }
        }
        return null;
    }



}
