import { ApiResponse } from "./ApiResponse";
import { CachedItem, ResponseCache } from "./Cache";

export class MemoryCache implements ResponseCache {

    private _cache = {}

    public setValue(key: string, value: CachedItem) {
        this._cache[key] = value;
    }

    public getValue(key:string) : CachedItem {
        return this._cache[key]
    }

}