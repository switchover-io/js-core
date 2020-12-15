export class AssertionResult{
    isValid: boolean;
    rolloutValue: any;

    constructor(isValid: boolean, rolloutValue?: any) {
        this.isValid = isValid;
        this.rolloutValue = rolloutValue;
    }
}