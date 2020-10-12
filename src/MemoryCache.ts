import { ApiResponse } from "./ApiResponse";
import { ResponseCache } from "./Cache";

export class MemoryCache implements ResponseCache {

    private _cache = {}

    public setValue(key: string, value: ApiResponse) {
        this._cache[key] = value;
    }

    public getValue(key:string) : ApiResponse {
        return this._cache[key]
    }

}