import { ApiResponse } from "./core/ApiResponse";

export interface ResponseCache {
    setValue(key: string, value: ApiResponse): void;
    getValue(key:string) : ApiResponse;
}