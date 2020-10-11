import { ApiResponse } from "./ApiResponse";

export interface ResponseCache {
    setValue(key: string, value: ApiResponse): void;
    getValue(key:string) : ApiResponse;
}