import { Logger } from "./util/Logger";
import { Condition, satisfies } from "./operators";


const ACTIVE = 1;
//const CONDITIONALLY_ACTIVE = 1;
const INACTIVE = 4;

const STRATEGY_ATLEASTONE = 1;
const STRATEGY_MAJORITY = 2;
const STRATEGY_ALL = 3;

export class Evaluator {

    private logger: Logger = Logger.getLogger();

    public evaluate(config: any, name: string, context: any, defaultValue: any){
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
                    return this.evaluateOnActive(toggle, context, defaultValue); 
                case INACTIVE:
                    return defaultValue;
            }

        }
        this.logger.error('Toggle with name ' + name + ' not found! Return default value');

        return defaultValue;
    }

    private evaluateOnActive(toggle, context, defaultValue: any) {
        if (this.hasConditions(toggle)) {
            return this.evaluateWithConditions(toggle, context, defaultValue);
        }
        return toggle.value;
    }

    private hasConditions(toggle) {
        return toggle.conditions &&  toggle.conditions.length > 0;
    }

    private evaluateWithConditions(toggle, context, defaultValue) {
        this.logger.debug('Evaluate toggle with conditions');
    
        if (!context && this.hasConditions(toggle) ) {
            return defaultValue
        }
    
        const strategy = parseInt(toggle.strategy);
    
        this.logger.debug('Evaluate toggle with strategy: ' + strategy);
    
        //TODO Check according evaluation strategy
        switch(strategy) {
            case STRATEGY_ALL:
                return this.evaluateAll(toggle, context) ? toggle.value : defaultValue;
            case STRATEGY_ATLEASTONE:
                return this.evaluateAtLeastOne(toggle, context) ? toggle.value : defaultValue;
            case STRATEGY_MAJORITY:
                return this.evaluateMajority(toggle, context) ? toggle.value : defaultValue;
        }
    
        throw new Error('No toggle.strategy given!');
    }
    
    private evaluateAll(toggle, context) {
        this.logger.debug('All toggle conditions have to be satisfied');
        for(const cond of toggle.conditions) {
            if (!satisfies(cond, context)) {
                this.logger.debug('Cond ' + cond.key + ' was not satisfied');       
                this.logger.debug(cond);
                return false;
            }
        }
        this.logger.debug('All conditions satisfied');
        return true;
    }
    
    private evaluateAtLeastOne(toggle, context) {
        this.logger.debug('At least one condition has to be satisfied');
        for(const cond of toggle.conditions) {
            if (satisfies(cond, context)) {
                this.logger.debug('Condition ' + cond.key + ' was satisfied by given context');
                return true;
            }
        }
        this.logger.debug('No condition satisfied');
        return false;
    }


    private evaluateMajority(toggle, context) : boolean {
        this.logger.debug('Majority of conditions has to be satisfied');

        let hit = 0;
        let miss = 0;
        for(const cond of toggle.conditions) {
            if (satisfies(cond, context)) {
                this.logger.debug('Condition ' + cond.key + ' was satisfied by given context');
                hit++
            } else {
                miss++
            }
        }
        return hit > miss;
    }
    
    
    private findByName(config, name) {
        for(let i in config) {
            if (config[i] && config[i].name === name) {
                return config[i];
            }
        }
        return null;
    }



}
