import { ApiResponse } from "./ApiResponse";

export interface Fetcher {
    fetchAll(sdkKey: string, lastModified?: string): Promise<ApiResponse | undefined>;
}