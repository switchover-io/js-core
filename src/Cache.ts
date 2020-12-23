import { ApiResponse } from "./ApiResponse";

export interface ResponseCache {
    setValue(key: string, value: CachedItem): void;
    getValue(key:string) : CachedItem;
}

export class CachedItem {

    constructor(
        public item: ApiResponse, 
        public timestamp: Date, 
        public ttl?: number) 
        {}

    isExpired() : boolean {
        const now = Date.now();

        if (!this.ttl || isNaN(this.ttl)) {
            return false;
        } else if ( (now - this.timestamp.getTime()) < this.ttl * 1000) {
            return false;
        }
        return true;
    }   
}