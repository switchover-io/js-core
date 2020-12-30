import { ApiResponse } from "./ApiResponse";

export function isExpired(cacheItem: CachedItem) : boolean {
    const now = Date.now();

    if (!cacheItem.ttl || isNaN(cacheItem.ttl)) {
        return false;
    } else if ( (now - cacheItem.timestamp.getTime()) < cacheItem.ttl * 1000) {
        return false;
    }
    return true;
}

export interface ResponseCache {
    setValue(key: string, value: CachedItem): void;
    getValue(key:string) : CachedItem;
}

export interface CachedItem {
    item: ApiResponse,
    timestamp: Date,
    ttl?: number
}

export class DefaultCachedItem implements CachedItem {
    constructor(
        public item: ApiResponse, 
        public timestamp: Date, 
        public ttl?: number) 
        {}
}