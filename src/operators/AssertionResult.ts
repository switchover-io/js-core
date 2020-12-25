export class AssertionResult{
    isValid: boolean;
    rolloutValue: any;
    variationId: any;

    constructor(isValid: boolean, rolloutValue?: any, variationId?: any) {
        this.isValid = isValid;
        this.rolloutValue = rolloutValue;
        this.variationId = variationId;
    }
}